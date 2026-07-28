const { supabase, supabaseAdmin } = require('../config/supabase');
const { generateFixtures } = require('../services/fixtureGenerator');
const { computeStandings } = require('../services/standingsService');
const { emitWebhook } = require('../services/webhookService');
const {
  attachParticipantCounts,
  fetchParticipantsWithUsers,
  getParticipantCount,
  timestamp,
} = require('../utils/competitionHelpers');

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

  const matchRows = fixtures
    .filter((f) => f.player_a_id && f.player_b_id)
    .map((f) => ({
      competition_id: id,
      round_number: f.round_number || 1,
      player_a_id: f.player_a_id,
      player_b_id: f.player_b_id,
      match_status: f.is_bye ? 'completed' : 'pending',
      is_bye: f.is_bye || false,
      // Double-game round robin: leg = 2 for reverse fixtures
      leg: f.leg || 1,
      // Round 1 deadline = 24 hours from competition start
      deadline: f.is_bye ? null : deadlineDate,
    }));

  if (matchRows.length > 0) {
    const { error: matchError } = await supabaseAdmin.from('matches').insert(matchRows);
    if (matchError) {
      return res.status(400).json({ success: false, error: { message: matchError.message } });
    }
  }

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

  const { data: competition, error: compError } = await supabaseAdmin
    .from('competitions')
    .select('*')
    .eq('id', id)
    .single();

  if (compError) {
    return res.status(404).json({ success: false, error: { message: 'Competition not found' } });
  }

  if (competition.competition_status !== 'active') {
    return res.status(400).json({
      success: false,
      error: { message: 'Competition is not active' },
    });
  }

  const currentRound = competition.current_round || 1;

  const { data: roundMatches } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('competition_id', id)
    .eq('round_number', currentRound);

  const unresolved = (roundMatches || []).filter((m) => m.match_status !== 'completed');

  if (unresolved.length > 0 && !includePendingMatches) {
    return res.status(400).json({
      success: false,
      error: {
        message: `${unresolved.length} match(es) in round ${currentRound} are not completed`,
      },
    });
  }

  const nextRound = currentRound + 1;
  const maxRounds = competition.rounds || 1;

  if (nextRound > maxRounds && competition.tournament_type !== 'knockout') {
    await supabaseAdmin
      .from('competitions')
      .update({ competition_status: 'completed', end_date: timestamp() })
      .eq('id', id);

    return res.json({
      success: true,
      data: {
        competition_id: id,
        previous_round: currentRound,
        current_round: currentRound,
        fixtures_generated: 0,
        unresolved_matches: unresolved.length,
        timestamp: timestamp(),
        action: 'completed',
      },
    });
  }

  const participants = await fetchParticipantsWithUsers(id);
  const { data: allMatches } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('competition_id', id);

  const completedMatches = (allMatches || []).filter((m) => m.match_status === 'completed');

  if (competition.tournament_type === 'knockout') {
    const roundWinners = completedMatches
      .filter((m) => m.round_number === currentRound)
      .map((m) => {
        if (m.result_winner === 'a') return m.player_a_id;
        if (m.result_winner === 'b') return m.player_b_id;
        return m.player_a_id;
      });

    if (roundWinners.length <= 1) {
      await supabaseAdmin
        .from('competitions')
        .update({ competition_status: 'completed', end_date: timestamp() })
        .eq('id', id);

      return res.json({
        success: true,
        data: {
        competition_id: id,
        previous_round: currentRound,
        current_round: currentRound,
        fixtures_generated: 0,
        unresolved_matches: unresolved.length,
        timestamp: timestamp(),
        action: 'completed',
      },
      });
    }
  }

  const fixtures = generateFixtures(
    competition,
    participants,
    allMatches || [],
    completedMatches,
    nextRound
  );

  const deadlineDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const matchRows = fixtures
    .filter((f) => f.player_a_id && f.player_b_id)
    .map((f) => ({
      competition_id: id,
      round_number: f.round_number || nextRound,
      player_a_id: f.player_a_id,
      player_b_id: f.player_b_id,
      match_status: 'pending',
      leg: f.leg || 1,
      // Round deadline = 24 hours from when admin clicks advance
      deadline: deadlineDate,
    }));

  if (matchRows.length > 0) {
    const { error: matchError } = await supabaseAdmin.from('matches').insert(matchRows);
    if (matchError) {
      return res.status(400).json({ success: false, error: { message: matchError.message } });
    }
  }

  await supabaseAdmin
    .from('competitions')
    .update({ current_round: nextRound })
    .eq('id', id);

  // Emit webhook for round advanced
  emitWebhook('round.advanced', {
    competition_id: id,
    name: competition.name,
    previous_round: currentRound,
    current_round: nextRound,
    fixtures_generated: matchRows.length,
    unresolved_matches: unresolved.length,
  });

  res.json({
    success: true,
    data: {
      competition_id: id,
      previous_round: currentRound,
      current_round: nextRound,
      fixtures_generated: matchRows.length,
      unresolved_matches: unresolved.length,
      timestamp: timestamp(),
    },
  });
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

  // DEBUG: Log match data
  console.log('[STANDINGS DEBUG] Matches for competition:', id);
  console.log('[STANDINGS DEBUG] Match count:', matches?.length || 0);
  console.log('[STANDINGS DEBUG] Sample matches:', JSON.stringify(matches?.slice(0, 4), null, 2));

  const standings = computeStandings(participants, matches || []);

  res.json({ success: true, data: standings });
};
