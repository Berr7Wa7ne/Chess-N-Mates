/**
 * Daily Chess.com compute — auto-score pending pairings across active tournaments.
 */

const { supabaseAdmin } = require('../config/supabase');
const {
  findGamesBetweenPlayers,
  resolveGameCandidates,
} = require('./chessComService');
const { advanceCompetitionRound } = require('./competitionAdvanceService');
const { emitWebhook } = require('./webhookService');
const { timestamp } = require('../utils/competitionHelpers');

function getScoreHelpers() {
  return require('../controllers/matchesController');
}

function emptyReport() {
  return {
    scored: 0,
    needs_review: 0,
    absent: 0,
    skipped: 0,
    advanced: false,
    advance_action: null,
    errors: [],
    match_results: [],
  };
}

async function applyAutoScore(match, { result_winner, chess_game_link, result_source }) {
  const { updateParticipantScores } = getScoreHelpers();

  const updates = {
    match_status: 'completed',
    result_winner,
    chess_game_link: chess_game_link || null,
    result_source,
    needs_review: false,
    auto_candidates: null,
    result_submitted_at: timestamp(),
    is_absent: false,
    absence_side: null,
    is_both_absent: false,
  };

  const { data, error } = await supabaseAdmin
    .from('matches')
    .update(updates)
    .eq('id', match.id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await updateParticipantScores(match.competition_id, {
    ...match,
    result_winner,
    is_absent: false,
    absence_side: null,
  });

  emitWebhook('match.result_confirmed', {
    match_id: match.id,
    competition_id: match.competition_id,
    result_winner,
    auto_scored: true,
    result_source,
  });

  return data;
}

async function applyBothAbsent(match) {
  const { updateParticipantScores } = getScoreHelpers();

  const updates = {
    match_status: 'completed',
    result_winner: 'draw',
    is_absent: true,
    is_both_absent: true,
    absence_side: 'both',
    result_source: 'absent_auto',
    needs_review: false,
    auto_candidates: null,
    result_submitted_at: timestamp(),
  };

  const { data, error } = await supabaseAdmin
    .from('matches')
    .update(updates)
    .eq('id', match.id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await updateParticipantScores(match.competition_id, {
    ...match,
    result_winner: 'draw',
    is_absent: true,
    absence_side: 'both',
  });

  return data;
}

async function flagNeedsReview(match, candidates) {
  const { error } = await supabaseAdmin
    .from('matches')
    .update({
      needs_review: true,
      auto_candidates: candidates,
      result_source: 'chess_com_auto',
    })
    .eq('id', match.id);

  if (error) throw new Error(error.message);
}

/**
 * Compute Chess.com results for one competition's current-round pending matches.
 */
async function computeCompetition(competitionId, options = {}) {
  const forceAbsentPastDeadline = options.forceAbsentPastDeadline !== false;
  const report = emptyReport();
  const archiveCache = options.archiveCache || new Map();

  const { data: competition, error: compError } = await supabaseAdmin
    .from('competitions')
    .select('*')
    .eq('id', competitionId)
    .single();

  if (compError || !competition) {
    report.errors.push({ competition_id: competitionId, message: 'Competition not found' });
    return report;
  }

  if (competition.competition_status !== 'active') {
    report.skipped += 1;
    report.errors.push({ competition_id: competitionId, message: 'Competition is not active' });
    return { ...report, competition_id: competitionId, competition_name: competition.name };
  }

  if ((competition.platform || 'chess.com') !== 'chess.com') {
    report.skipped += 1;
    return {
      ...report,
      competition_id: competitionId,
      competition_name: competition.name,
      message: 'Skipped: platform is not chess.com',
    };
  }

  if (competition.auto_compute_enabled === false && !options.ignoreAutoComputeFlag) {
    report.skipped += 1;
    return {
      ...report,
      competition_id: competitionId,
      competition_name: competition.name,
      message: 'Skipped: auto_compute_enabled is false',
    };
  }

  const currentRound = competition.current_round || 1;

  const { data: roundMatches, error: matchError } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('round_number', currentRound);

  if (matchError) {
    report.errors.push({ competition_id: competitionId, message: matchError.message });
    return { ...report, competition_id: competitionId, competition_name: competition.name };
  }

  const pending = (roundMatches || []).filter(
    (m) => !m.is_bye && ['pending', 'ongoing'].includes(m.match_status)
  );

  const userIds = [...new Set(pending.flatMap((m) => [m.player_a_id, m.player_b_id]))];
  const usersById = new Map();
  if (userIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('users')
      .select('id, chess_com_username, display_name')
      .in('id', userIds);
    for (const u of data || []) usersById.set(u.id, u);
  }

  const now = Date.now();

  for (const match of pending) {
    try {
      const playerA = usersById.get(match.player_a_id);
      const playerB = usersById.get(match.player_b_id);
      const userA = playerA?.chess_com_username;
      const userB = playerB?.chess_com_username;

      if (!userA || !userB) {
        report.skipped += 1;
        report.match_results.push({
          match_id: match.id,
          status: 'skipped',
          reason: 'Missing chess.com username on one or both players',
        });
        continue;
      }

      const sinceMs = match.created_at
        ? new Date(match.created_at).getTime()
        : now - 48 * 60 * 60 * 1000;
      const deadlineMs = match.deadline ? new Date(match.deadline).getTime() : null;
      const pastDeadline = deadlineMs != null ? now > deadlineMs : false;
      // Search up to deadline (or now if no deadline / still open)
      const untilMs = deadlineMs != null ? deadlineMs : now;

      const candidates = await findGamesBetweenPlayers(userA, userB, {
        sinceMs,
        untilMs,
        timeControl: competition.time_control || null,
        cache: archiveCache,
        delayMs: 120,
      });

      const resolution = resolveGameCandidates(candidates);

      if (resolution.decision === 'auto' && resolution.game) {
        await applyAutoScore(match, {
          result_winner: resolution.game.result_winner,
          chess_game_link: resolution.game.url,
          result_source: 'chess_com_auto',
        });
        report.scored += 1;
        report.match_results.push({
          match_id: match.id,
          status: 'scored',
          result_winner: resolution.game.result_winner,
          chess_game_link: resolution.game.url,
        });
        continue;
      }

      if (resolution.decision === 'needs_review') {
        await flagNeedsReview(match, resolution.candidates);
        report.needs_review += 1;
        report.match_results.push({
          match_id: match.id,
          status: 'needs_review',
          candidates: resolution.candidates,
        });
        continue;
      }

      if (forceAbsentPastDeadline && pastDeadline) {
        await applyBothAbsent(match);
        report.absent += 1;
        report.match_results.push({
          match_id: match.id,
          status: 'absent',
          reason: 'No game found after deadline',
        });
        continue;
      }

      report.skipped += 1;
      report.match_results.push({
        match_id: match.id,
        status: 'skipped',
        reason: pastDeadline ? 'No game found' : 'No game found yet (before deadline)',
      });
    } catch (err) {
      report.errors.push({
        match_id: match.id,
        competition_id: competitionId,
        message: err.message || String(err),
      });
    }
  }

  const { data: afterMatches } = await supabaseAdmin
    .from('matches')
    .select('id, match_status')
    .eq('competition_id', competitionId)
    .eq('round_number', currentRound);

  const unresolved = (afterMatches || []).filter((m) => m.match_status !== 'completed');

  if (unresolved.length === 0 && (roundMatches || []).length > 0) {
    const advance = await advanceCompetitionRound(competitionId, {
      includePendingMatches: false,
    });
    if (advance.success) {
      report.advanced = true;
      report.advance_action = advance.data?.action || 'advanced';
      report.advance = advance.data;
    } else if (advance.error) {
      report.errors.push({
        competition_id: competitionId,
        message: `Auto-advance failed: ${advance.error}`,
      });
    }
  }

  return {
    ...report,
    competition_id: competitionId,
    competition_name: competition.name,
    current_round: currentRound,
    still_unresolved: unresolved.length,
  };
}

async function computeAllActive(options = {}) {
  const startedAt = new Date().toISOString();
  const archiveCache = new Map();

  const { data: competitions, error } = await supabaseAdmin
    .from('competitions')
    .select('id, name, platform, auto_compute_enabled, competition_status')
    .eq('competition_status', 'active');

  if (error) {
    return {
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      competitions: [],
      errors: [{ message: error.message }],
    };
  }

  const eligible = (competitions || []).filter((c) => {
    if ((c.platform || 'chess.com') !== 'chess.com') return false;
    if (c.auto_compute_enabled === false && !options.ignoreAutoComputeFlag) return false;
    return true;
  });

  const reports = [];
  for (const c of eligible) {
    const report = await computeCompetition(c.id, { ...options, archiveCache });
    reports.push(report);
  }

  const summary = {
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    competitions_processed: reports.length,
    scored: reports.reduce((s, r) => s + (r.scored || 0), 0),
    needs_review: reports.reduce((s, r) => s + (r.needs_review || 0), 0),
    absent: reports.reduce((s, r) => s + (r.absent || 0), 0),
    skipped: reports.reduce((s, r) => s + (r.skipped || 0), 0),
    advanced: reports.filter((r) => r.advanced).length,
    competitions: reports,
    errors: reports.flatMap((r) => r.errors || []),
  };

  try {
    await supabaseAdmin.from('job_runs').insert({
      job_name: 'daily-compute',
      started_at: startedAt,
      finished_at: summary.finished_at,
      summary,
    });
  } catch {
    // table may not exist yet
  }

  return summary;
}

module.exports = {
  computeCompetition,
  computeAllActive,
};
