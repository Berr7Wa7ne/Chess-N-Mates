const { supabase, supabaseAdmin } = require('../config/supabase');
const { generateFixtures, recommendTournamentFormat } = require('../services/fixtureGenerator');
const { computeStandings } = require('../services/standingsService');
const {
  attachTournamentOdds,
  buildCompetitionH2HMatrix,
  enrichMatchesWithOdds,
  buildOddsSnapshotPayload,
  computeHeadToHead,
} = require('../services/oddsService');
const { emitWebhook } = require('../services/webhookService');
const {
  fixturesToMatchRows,
  applyByeParticipantUpdates,
  eliminateKnockoutLosers,
} = require('../services/tournamentLifecycle');
const { advanceCompetitionRound } = require('../services/competitionAdvanceService');
const { computeCompetition } = require('../services/dailyComputeService');
const {
  attachParticipantCounts,
  fetchParticipantsWithUsers,
  getParticipantCount,
  timestamp,
} = require('../utils/competitionHelpers');

/** Persist odds snapshot at most once per 15 minutes per competition (fire-and-forget). */
async function maybePersistOddsSnapshot(competition, participants, matches, standingsWithOdds) {
  try {
    const { data: latest } = await supabaseAdmin
      .from('competition_odds_snapshots')
      .select('id, snapshot_at')
      .eq('competition_id', competition.id)
      .order('snapshot_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest?.snapshot_at) {
      const ageMs = Date.now() - new Date(latest.snapshot_at).getTime();
      if (ageMs < 15 * 60 * 1000) return;
    }

    const withMatchOdds = enrichMatchesWithOdds(matches || [], matches || []);
    const payload = buildOddsSnapshotPayload(standingsWithOdds, withMatchOdds, competition);
    payload.h2h_matrix = buildCompetitionH2HMatrix(participants, matches || []);

    await supabaseAdmin.from('competition_odds_snapshots').insert({
      competition_id: competition.id,
      round_number: competition.current_round ?? null,
      standings_odds: payload.standings_odds,
      match_odds: payload.match_odds,
      h2h_matrix: payload.h2h_matrix,
    });
  } catch (err) {
    console.warn('[odds] snapshot skipped:', err.message);
  }
}

const ALLOWED_UPDATE_FIELDS = [
  'name',
  'description',
  'tournament_type',
  'competition_status',
  'current_round',
  'registration_open_at',
  'registration_close_at',
  'start_date',
  'end_date',
  'max_participants',
  'rounds',
  'min_elo',
  'max_elo',
  'time_control',
  'timezone',
  'entry_fee',
  'prize',
  'platform',
  'match_length',
  'format_match_rules',
  'rules',
  'round_robin_legs',
  'auto_compute_enabled',
  'image_url',
  'is_featured',
];

exports.createCompetition = async (req, res) => {
  const {
    name,
    description,
    tournament_type,
    max_participants,
    rounds,
    min_elo,
    max_elo,
    created_by,
    registration_open_at,
    registration_close_at,
    start_date,
    end_date,
    time_control,
    timezone,
    entry_fee,
    prize,
    platform,
    match_length,
    format_match_rules,
    rules,
    round_robin_legs,
    auto_compute_enabled,
    image_url,
    is_featured,
  } = req.body;

function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// In createCompetition, add:
if (!created_by || !isValidUUID(created_by)) {
  return res.status(400).json({
    success: false,
    error: { message: 'Invalid user ID format. Expected UUID.' }
  });
}


  if (!name || !tournament_type || !created_by) {
    return res.status(400).json({
      success: false,
      error: { message: 'name, tournament_type, and created_by are required' },
    });
  }

  const requiredDateFields = {
    registration_open_at,
    registration_close_at,
    start_date,
    end_date,
  };
  const missingDateFields = Object.entries(requiredDateFields)
    .filter(([, value]) => !value)
    .map(([field]) => field);

  if (missingDateFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: `${missingDateFields.join(', ')} ${missingDateFields.length === 1 ? 'is' : 'are'} required`,
      },
    });
  }

  const { data, error } = await supabaseAdmin
    .from('competitions')
    .insert([{
      name,
      description,
      tournament_type,
      max_participants: max_participants ?? 32,
      rounds: rounds ?? 5,
      min_elo: min_elo ?? 800,
      max_elo: max_elo ?? 3000,
      created_by,
      registration_open_at,
      registration_close_at,
      start_date,
      end_date,
      time_control,
      timezone: timezone ?? 'UTC+1:00',
      entry_fee,
      prize,
      platform: platform ?? 'chess.com',
      match_length: match_length ?? 'single_match',
      format_match_rules,
      rules: rules ?? [],
      round_robin_legs: round_robin_legs ?? 1,
      auto_compute_enabled: auto_compute_enabled !== false,
      image_url: image_url?.trim() || null,
      is_featured: Boolean(is_featured),
      competition_status: 'draft',
      current_round: 0,
    }])
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, error: { message: error.message } });
  res.status(201).json({ success: true, data: { ...data, participant_count: 0 } });
};

exports.getCompetitions = async (req, res) => {
  const status = req.query.status;
  const type = req.query.type;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;

  let query = supabaseAdmin
    .from('competitions')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('competition_status', status);
  if (type) query = query.eq('tournament_type', type);

  const { data, error, count } = await query;

  if (error) return res.status(400).json({ success: false, error: { message: error.message } });

  const enriched = await attachParticipantCounts(data || []);

  res.json({
    success: true,
    data: enriched,
    pagination: { total: count ?? enriched.length, limit, offset },
  });
};

exports.getCompetition = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from('competitions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return res.status(404).json({ success: false, error: { message: error.message } });

  const participant_count = await getParticipantCount(id);

  res.json({ success: true, data: { ...data, participant_count } });
};

exports.updateCompetition = async (req, res) => {
  const { id } = req.params;
  const updates = {};

  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      error: { message: 'No valid fields to update' },
    });
  }

  const { data, error } = await supabaseAdmin
    .from('competitions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, error: { message: error.message } });

  const participant_count = await getParticipantCount(id);

  // Emit webhook if competition_status changed
  if (updates.competition_status) {
    emitWebhook('competition.status_changed', {
      competition_id: id,
      previous_status: data.competition_status,
      new_status: updates.competition_status,
      name: data.name,
      participant_count,
    });
  }

  res.json({ success: true, data: { ...data, participant_count } });
};

exports.startCompetition = async (req, res) => {
  const { id } = req.params;

  const { data: competition, error: compError } = await supabaseAdmin
    .from('competitions')
    .select('*')
    .eq('id', id)
    .single();

  if (compError) {
    return res.status(404).json({ success: false, error: { message: 'Competition not found' } });
  }

  if (competition.competition_status !== 'open_registration') {
    return res.status(400).json({
      success: false,
      error: { message: 'Competition not in "open_registration" status' },
    });
  }

  const participants = await fetchParticipantsWithUsers(id);
  const eligible = participants.filter((p) => p.participant_status === 'registered');

  if (eligible.length < 2) {
    return res.status(400).json({
      success: false,
      error: { message: 'Not enough participants (minimum 2)' },
    });
  }

  const { data: existingMatches } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('competition_id', id);

  const fixtures = generateFixtures(
    competition,
    eligible,
    existingMatches || [],
    [],
    1
  );

  const deadlineDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const matchRows = fixturesToMatchRows(id, fixtures, 1, deadlineDate);

  if (matchRows.length > 0) {
    const { error: matchError } = await supabaseAdmin.from('matches').insert(matchRows);
    if (matchError) {
      return res.status(400).json({ success: false, error: { message: matchError.message } });
    }
  }

  await applyByeParticipantUpdates(
    supabaseAdmin,
    id,
    fixtures.filter((f) => f.is_bye)
  );

  await supabaseAdmin
    .from('competition_participants')
    .update({ participant_status: 'active' })
    .eq('competition_id', id)
    .eq('participant_status', 'registered');

  const { error: updateError } = await supabaseAdmin
    .from('competitions')
    .update({ competition_status: 'active', current_round: 1 })
    .eq('id', id);

  if (updateError) {
    return res.status(400).json({ success: false, error: { message: updateError.message } });
  }

  // Emit webhook for competition started
  emitWebhook('competition.started', {
    competition_id: id,
    name: competition.name,
    round: 1,
    fixtures_generated: matchRows.length,
    participant_count: eligible.length,
  });

  res.json({
    success: true,
    data: {
      competition_id: id,
      action: 'started',
      round: 1,
      fixtures_generated: matchRows.length,
      timestamp: timestamp(),
    },
  });
};

exports.advanceRound = async (req, res) => {
  const { id } = req.params;
  const includePendingMatches = Boolean(req.body?.include_pending_matches);

  const result = await advanceCompetitionRound(id, { includePendingMatches });

  if (!result.success) {
    return res.status(result.status || 400).json({
      success: false,
      error: { message: result.error || 'Failed to advance round' },
    });
  }

  res.json({ success: true, data: result.data });
};

exports.computeResults = async (req, res) => {
  const { id } = req.params;
  const ignoreAutoComputeFlag = Boolean(req.body?.force);

  try {
    const report = await computeCompetition(id, {
      ignoreAutoComputeFlag: true, // admin button always runs
      forceAbsentPastDeadline: req.body?.mark_absent_past_deadline !== false,
    });
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { message: err.message || 'Compute failed' },
    });
  }
};

exports.deleteCompetition = async (req, res) => {
  const { id } = req.params;

  // Fetch the competition first to confirm it exists
  const { data: competition, error: compError } = await supabaseAdmin
    .from('competitions')
    .select('id, name, competition_status')
    .eq('id', id)
    .single();

  if (compError) {
    return res.status(404).json({ success: false, error: { message: 'Competition not found' } });
  }

  // Delete related records first (order matters for foreign keys)
  const { count: deletedParticipants, error: partError } = await supabaseAdmin
    .from('competition_participants')
    .delete({ count: 'exact' })
    .eq('competition_id', id);

  if (partError) {
    return res.status(400).json({ success: false, error: { message: partError.message } });
  }

  // Get all match IDs for this competition before deleting matches
  const { data: competitionMatches, error: matchesFetchError } = await supabaseAdmin
    .from('matches')
    .select('id')
    .eq('competition_id', id);

  if (matchesFetchError) {
    return res.status(400).json({ success: false, error: { message: matchesFetchError.message } });
  }

  // Delete disputes associated with these matches (must be done before deleting matches)
  if (competitionMatches && competitionMatches.length > 0) {
    const matchIds = competitionMatches.map(m => m.id);
    const { count: deletedDisputes, error: disputeError } = await supabaseAdmin
      .from('disputes')
      .delete({ count: 'exact' })
      .in('match_id', matchIds);

    if (disputeError) {
      return res.status(400).json({ success: false, error: { message: disputeError.message } });
    }
  }

  const { count: deletedMatches, error: matchError } = await supabaseAdmin
    .from('matches')
    .delete({ count: 'exact' })
    .eq('competition_id', id);

  if (matchError) {
    return res.status(400).json({ success: false, error: { message: matchError.message } });
  }

  // Now delete the competition itself
  const { error: deleteError } = await supabaseAdmin
    .from('competitions')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return res.status(400).json({ success: false, error: { message: deleteError.message } });
  }

  res.json({
    success: true,
    data: {
      competition_id: id,
      competition_name: competition.name,
      deleted_participants: deletedParticipants ?? 0,
      deleted_matches: deletedMatches ?? 0,
      timestamp: timestamp(),
    },
  });
};

exports.getStandings = async (req, res) => {
  const { id } = req.params;

  const { data: competition, error: compError } = await supabaseAdmin
    .from('competitions')
    .select('id, tournament_type, rounds, current_round, competition_status')
    .eq('id', id)
    .single();

  if (compError) {
    return res.status(404).json({ success: false, error: { message: 'Competition not found' } });
  }

  const participants = await fetchParticipantsWithUsers(id);

  const { data: matches, error: matchError } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('competition_id', id);

  if (matchError) {
    return res.status(400).json({ success: false, error: { message: matchError.message } });
  }

  const standings = computeStandings(participants, matches || [], {
    tournamentType: competition.tournament_type,
  });

  const withOdds = attachTournamentOdds(standings, participants, matches || [], competition);

  // Track over time without blocking the response
  maybePersistOddsSnapshot(competition, participants, matches || [], withOdds).catch(() => {});

  res.json({ success: true, data: withOdds });
};

/** GET /competitions/:id/h2h — pairwise H2H for this tournament (optional player_a / player_b) */
exports.getCompetitionH2H = async (req, res) => {
  const { id } = req.params;
  const { player_a, player_b } = req.query;

  const { data: competition, error: compError } = await supabaseAdmin
    .from('competitions')
    .select('id')
    .eq('id', id)
    .single();

  if (compError) {
    return res.status(404).json({ success: false, error: { message: 'Competition not found' } });
  }

  const participants = await fetchParticipantsWithUsers(id);
  const { data: matches, error: matchError } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('competition_id', id);

  if (matchError) {
    return res.status(400).json({ success: false, error: { message: matchError.message } });
  }

  if (player_a && player_b) {
    const h2h = computeHeadToHead(player_a, player_b, matches || []);
    const nameOf = (uid) => {
      const p = participants.find((x) => x.user_id === uid);
      const u = p?.users || {};
      return u.display_name || u.chess_com_username || u.chess_username || uid;
    };
    return res.json({
      success: true,
      data: {
        competition_id: competition.id,
        ...h2h,
        player_a_name: nameOf(player_a),
        player_b_name: nameOf(player_b),
      },
    });
  }

  res.json({
    success: true,
    data: {
      competition_id: competition.id,
      pairs: buildCompetitionH2HMatrix(participants, matches || []),
    },
  });
};

/** GET /competitions/:id/odds-history — stored snapshots of win % / match odds / H2H */
exports.getOddsHistory = async (req, res) => {
  const { id } = req.params;
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const { data, error } = await supabaseAdmin
    .from('competition_odds_snapshots')
    .select('*')
    .eq('competition_id', id)
    .order('snapshot_at', { ascending: false })
    .limit(limit);

  if (error) {
    return res.status(400).json({ success: false, error: { message: error.message } });
  }

  res.json({ success: true, data: data || [] });
};

/** GET /competitions/format-advice?participants=12 */
exports.getFormatAdvice = async (req, res) => {
  const n = Number(req.query.participants ?? req.query.n ?? 0);
  const advice = recommendTournamentFormat(n);
  res.json({ success: true, data: advice });
};
