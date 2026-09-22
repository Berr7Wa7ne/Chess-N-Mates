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
const {
  newRunId,
  writeComputeAudit,
  writeComputeAuditBatch,
} = require('./computeAuditService');

/** Look back from deadline (or now) when searching Chess.com archives. */
const SEARCH_LOOKBACK_MS = 48 * 60 * 60 * 1000;

function getScoreHelpers() {
  return require('../controllers/matchesController');
}

function chessComHandle(user) {
  if (!user) return null;
  return (
    (user.chess_com_username && String(user.chess_com_username).trim()) ||
    (user.chess_username && String(user.chess_username).trim()) ||
    null
  );
}

/**
 * Search window for a pairing (Swiss + RR + same-day).
 *
 * - Always search through *now* so admin Compute finds games just finished.
 * - Prefer match.created_at when the row was opened recently (Swiss / activated RR).
 * - If created_at is far older than the deadline (bulk RR day-one insert), use
 *   the deadline window instead.
 */
function matchSearchWindow(match, now = Date.now()) {
  const deadlineMs = match.deadline ? new Date(match.deadline).getTime() : null;
  const createdMs = match.created_at ? new Date(match.created_at).getTime() : null;
  const pastDeadline = deadlineMs != null && !Number.isNaN(deadlineMs) ? now > deadlineMs : false;

  const STALE_BULK_MS = 36 * 60 * 60 * 1000;
  let sinceMs;

  const deadlineLooksRefreshed =
    deadlineMs != null &&
    createdMs != null &&
    !Number.isNaN(deadlineMs) &&
    !Number.isNaN(createdMs) &&
    deadlineMs - createdMs > STALE_BULK_MS;

  if (createdMs != null && !Number.isNaN(createdMs) && !deadlineLooksRefreshed) {
    // Swiss / freshly created round: search from when the pairing was opened
    sinceMs = createdMs;
  } else if (deadlineMs != null && !Number.isNaN(deadlineMs)) {
    sinceMs = Math.min(deadlineMs, now) - SEARCH_LOOKBACK_MS;
  } else if (createdMs != null && !Number.isNaN(createdMs)) {
    sinceMs = createdMs;
  } else {
    sinceMs = now - SEARCH_LOOKBACK_MS;
  }

  return {
    sinceMs,
    untilMs: now,
    deadlineMs,
    pastDeadline,
  };
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
  const runId = options.run_id || newRunId();
  const triggeredBy = options.triggered_by || 'system';
  const actorUserId = options.actor_user_id || null;
  const startedAt = new Date().toISOString();

  const auditBase = {
    competition_id: competitionId,
    run_id: runId,
    triggered_by: triggeredBy,
    actor_user_id: actorUserId,
  };

  const { data: competition, error: compError } = await supabaseAdmin
    .from('competitions')
    .select('*')
    .eq('id', competitionId)
    .single();

  if (compError || !competition) {
    report.errors.push({ competition_id: competitionId, message: 'Competition not found' });
    await writeComputeAudit({
      ...auditBase,
      action: 'compute_run',
      action_result: 'error',
      message: 'Competition not found',
      details: { started_at: startedAt },
    });
    return { ...report, run_id: runId };
  }

  auditBase.competition_id = competition.id;

  if (competition.competition_status !== 'active') {
    report.skipped += 1;
    report.errors.push({ competition_id: competitionId, message: 'Competition is not active' });
    await writeComputeAudit({
      ...auditBase,
      action: 'compute_run',
      action_result: 'skipped',
      message: 'Competition is not active',
      details: {
        competition_name: competition.name,
        competition_status: competition.competition_status,
      },
    });
    return {
      ...report,
      competition_id: competitionId,
      competition_name: competition.name,
      run_id: runId,
    };
  }

  if ((competition.platform || 'chess.com') !== 'chess.com') {
    report.skipped += 1;
    await writeComputeAudit({
      ...auditBase,
      action: 'compute_run',
      action_result: 'skipped',
      message: 'Skipped: platform is not chess.com',
      details: { platform: competition.platform },
    });
    return {
      ...report,
      competition_id: competitionId,
      competition_name: competition.name,
      message: 'Skipped: platform is not chess.com',
      run_id: runId,
    };
  }

  if (competition.auto_compute_enabled === false && !options.ignoreAutoComputeFlag) {
    report.skipped += 1;
    await writeComputeAudit({
      ...auditBase,
      action: 'compute_run',
      action_result: 'skipped',
      message: 'Skipped: auto_compute_enabled is false',
    });
    return {
      ...report,
      competition_id: competitionId,
      competition_name: competition.name,
      message: 'Skipped: auto_compute_enabled is false',
      run_id: runId,
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
    await writeComputeAudit({
      ...auditBase,
      action: 'compute_run',
      action_result: 'error',
      message: matchError.message,
      details: { current_round: currentRound },
    });
    return {
      ...report,
      competition_id: competitionId,
      competition_name: competition.name,
      run_id: runId,
    };
  }

  const pending = (roundMatches || []).filter(
    (m) => !m.is_bye && ['pending', 'ongoing'].includes(m.match_status)
  );

  await writeComputeAudit({
    ...auditBase,
    action: 'compute_started',
    action_result: 'info',
    message: `Started compute for round ${currentRound} (${pending.length} pending match${pending.length === 1 ? '' : 'es'})`,
    details: {
      competition_name: competition.name,
      current_round: currentRound,
      time_control: competition.time_control,
      pending_count: pending.length,
      total_round_matches: (roundMatches || []).length,
      force_absent_past_deadline: forceAbsentPastDeadline,
      loose_time_control: options.looseTimeControl !== false,
      started_at: startedAt,
    },
  });

  const userIds = [...new Set(pending.flatMap((m) => [m.player_a_id, m.player_b_id]))];
  const usersById = new Map();
  if (userIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('users')
      .select('id, chess_com_username, chess_username, display_name')
      .in('id', userIds);
    for (const u of data || []) usersById.set(u.id, u);
  }

  const now = Date.now();
  const auditBatch = [];

  for (const match of pending) {
    try {
      const playerA = usersById.get(match.player_a_id);
      const playerB = usersById.get(match.player_b_id);
      const userA = chessComHandle(playerA);
      const userB = chessComHandle(playerB);
      const pairLabel = `${playerA?.display_name || userA || '?'} vs ${playerB?.display_name || userB || '?'}`;

      if (!userA || !userB) {
        report.skipped += 1;
        report.match_results.push({
          match_id: match.id,
          status: 'skipped',
          reason: 'Missing chess.com username on one or both players',
        });
        auditBatch.push({
          ...auditBase,
          match_id: match.id,
          action: 'match_lookup',
          action_result: 'skipped',
          message: `${pairLabel}: missing Chess.com username`,
          details: {
            player_a: playerA?.display_name || null,
            player_b: playerB?.display_name || null,
            chess_com_a: userA,
            chess_com_b: userB,
          },
        });
        continue;
      }

      const { sinceMs, untilMs, pastDeadline } = matchSearchWindow(match, now);

      const candidates = await findGamesBetweenPlayers(userA, userB, {
        sinceMs,
        untilMs,
        timeControl: competition.time_control || null,
        looseTimeControl: options.looseTimeControl !== false,
        cache: archiveCache,
        delayMs: 120,
      });

      const resolution = resolveGameCandidates(candidates);
      const windowDetails = {
        pair: pairLabel,
        chess_com_a: userA,
        chess_com_b: userB,
        search_since: new Date(sinceMs).toISOString(),
        search_until: new Date(untilMs).toISOString(),
        match_deadline: match.deadline,
        past_deadline: pastDeadline,
        candidates_found: candidates.length,
        time_control: competition.time_control,
      };

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
        auditBatch.push({
          ...auditBase,
          match_id: match.id,
          action: 'match_scored',
          action_result: 'success',
          message: `${pairLabel}: scored ${resolution.game.result_winner} from Chess.com`,
          details: {
            ...windowDetails,
            result_winner: resolution.game.result_winner,
            chess_game_link: resolution.game.url,
            game_end_time: resolution.game.end_time
              ? new Date(resolution.game.end_time * 1000).toISOString()
              : null,
          },
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
        auditBatch.push({
          ...auditBase,
          match_id: match.id,
          action: 'match_needs_review',
          action_result: 'needs_review',
          message: `${pairLabel}: conflicting Chess.com games — needs review`,
          details: {
            ...windowDetails,
            candidates: (resolution.candidates || []).map((c) => ({
              url: c.url,
              result_winner: c.result_winner,
              end_time: c.end_time,
            })),
          },
        });
        continue;
      }

      if (forceAbsentPastDeadline && pastDeadline && match.deadline) {
        await applyBothAbsent(match);
        report.absent += 1;
        report.match_results.push({
          match_id: match.id,
          status: 'absent',
          reason: 'No game found after deadline',
        });
        auditBatch.push({
          ...auditBase,
          match_id: match.id,
          action: 'match_absent',
          action_result: 'absent',
          message: `${pairLabel}: no game found after deadline — marked both absent`,
          details: windowDetails,
        });
        continue;
      }

      const skipReason = pastDeadline
        ? 'No game found'
        : match.deadline
          ? 'No game found yet (before deadline)'
          : 'No game found yet (round window not opened)';
      report.skipped += 1;
      report.match_results.push({
        match_id: match.id,
        status: 'skipped',
        reason: skipReason,
      });
      auditBatch.push({
        ...auditBase,
        match_id: match.id,
        action: 'match_lookup',
        action_result: 'skipped',
        message: `${pairLabel}: ${skipReason}`,
        details: windowDetails,
      });
    } catch (err) {
      report.errors.push({
        match_id: match.id,
        competition_id: competitionId,
        message: err.message || String(err),
      });
      auditBatch.push({
        ...auditBase,
        match_id: match.id,
        action: 'match_lookup',
        action_result: 'error',
        message: err.message || String(err),
        details: { stack: err.stack ? String(err.stack).slice(0, 500) : null },
      });
    }
  }

  await writeComputeAuditBatch(auditBatch);

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
      await writeComputeAudit({
        ...auditBase,
        action: 'round_advanced',
        action_result: 'success',
        message:
          advance.data?.action === 'completed'
            ? 'All matches complete — tournament marked completed'
            : `Round advanced to ${advance.data?.current_round}`,
        details: advance.data || {},
      });
    } else if (advance.error) {
      report.errors.push({
        competition_id: competitionId,
        message: `Auto-advance failed: ${advance.error}`,
      });
      await writeComputeAudit({
        ...auditBase,
        action: 'round_advanced',
        action_result: 'error',
        message: `Auto-advance failed: ${advance.error}`,
      });
    }
  }

  const finishedAt = new Date().toISOString();
  await writeComputeAudit({
    ...auditBase,
    action: 'compute_finished',
    action_result: report.errors.length > 0 ? 'error' : 'success',
    message: `Finished: ${report.scored} scored, ${report.needs_review} review, ${report.absent} absent, ${report.skipped} skipped${report.advanced ? ', round advanced' : ''}`,
    details: {
      competition_name: competition.name,
      current_round: currentRound,
      scored: report.scored,
      needs_review: report.needs_review,
      absent: report.absent,
      skipped: report.skipped,
      advanced: report.advanced,
      advance_action: report.advance_action,
      still_unresolved: unresolved.length,
      error_count: report.errors.length,
      started_at: startedAt,
      finished_at: finishedAt,
    },
  });

  return {
    ...report,
    competition_id: competitionId,
    competition_name: competition.name,
    current_round: currentRound,
    still_unresolved: unresolved.length,
    run_id: runId,
  };
}

async function computeAllActive(options = {}) {
  const startedAt = new Date().toISOString();
  const archiveCache = new Map();
  const triggeredBy = options.triggered_by || 'cron';

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
    const report = await computeCompetition(c.id, {
      ...options,
      archiveCache,
      triggered_by: triggeredBy,
    });
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
  matchSearchWindow,
  chessComHandle,
};
