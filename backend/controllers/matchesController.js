const { supabase, supabaseAdmin } = require('../config/supabase');
const { timestamp } = require('../utils/competitionHelpers');

exports.getCompetitionMatches = async (req, res) => {
  const { competition_id } = req.params;
  const { round, status, player_id } = req.query;

  let query = supabaseAdmin
    .from('matches')
    .select(`
      *,
      player_a:player_a_id(id, display_name, chess_username, chess_elo),
      player_b:player_b_id(id, display_name, chess_username, chess_elo)
    `)
    .eq('competition_id', competition_id)
    .order('round_number', { ascending: true })
    .order('id', { ascending: true });

  if (round) query = query.eq('round_number', round);
  if (status) query = query.eq('match_status', status);
  if (player_id) {
    query = query.or(`player_a_id.eq.${player_id},player_b_id.eq.${player_id}`);
  }

  const { data, error } = await query;

  if (error) return res.status(400).json({ success: false, error: { message: error.message } });
  res.json({ success: true, data: data || [] });
};

exports.getMatch = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from('matches')
    .select(`
      *,
      player_a:player_a_id(id, display_name, chess_username, chess_elo),
      player_b:player_b_id(id, display_name, chess_username, chess_elo)
    `)
    .eq('id', id)
    .single();

  if (error) return res.status(404).json({ success: false, error: { message: error.message } });
  res.json({ success: true, data });
};

exports.submitResult = async (req, res) => {
  const { id } = req.params;
  const { result_winner, chess_game_link, chess_game_id, user_id } = req.body;

  if (!result_winner || !user_id) {
    return res.status(400).json({
      success: false,
      error: { message: 'result_winner and user_id are required' },
    });
  }

  if (!['a', 'b', 'draw'].includes(result_winner)) {
    return res.status(400).json({
      success: false,
      error: { message: 'result_winner must be "a", "b", or "draw"' },
    });
  }

  const { data: match, error: matchError } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('id', id)
    .single();

  if (matchError) return res.status(404).json({ success: false, error: { message: 'Match not found' } });

  if (match.match_status !== 'pending' && match.match_status !== 'ongoing') {
    return res.status(400).json({
      success: false,
      error: { message: 'Match status is not "pending" or "ongoing"' },
    });
  }

  if (match.player_a_id !== user_id && match.player_b_id !== user_id) {
    return res.status(403).json({
      success: false,
      error: { message: 'User is not one of the match participants' },
    });
  }

  if (chess_game_link && chess_game_link.length > 500) {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid game link format' },
    });
  }

  // Validate user_id is a UUID, not a numeric ID
  if (/^\d+$/.test(user_id)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid user_id format. Use the Supabase Auth UUID.' },
    });
  }

  const updates = {
    match_status: 'result_submitted',
    result_winner,
    result_submitted_by: user_id,
    result_submitted_at: timestamp(),
  };

  if (chess_game_link) updates.chess_game_link = chess_game_link;
  if (chess_game_id) updates.chess_game_id = chess_game_id;

  const { data, error } = await supabaseAdmin
    .from('matches')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, error: { message: error.message } });
  res.json({ success: true, data });
};

exports.confirmResult = async (req, res) => {
  const { id } = req.params;

  const { data: match, error: matchError } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('id', id)
    .single();

  if (matchError) return res.status(404).json({ success: false, error: { message: 'Match not found' } });

  if (match.match_status !== 'result_submitted') {
    return res.status(400).json({
      success: false,
      error: { message: 'Match status must be "result_submitted" to confirm' },
    });
  }

  const { data, error } = await supabaseAdmin
    .from('matches')
    .update({
      match_status: 'completed',
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, error: { message: error.message } });

  // Update participant scores
  await updateParticipantScores(match.competition_id, match.player_a_id, match.player_b_id, match.result_winner);

  res.json({
    success: true,
    data: {
      ...data,
      confirmed_at: timestamp(),
    },
  });
};

exports.forceResult = async (req, res) => {
  const { id } = req.params;
  const { result_winner, reason } = req.body;

  if (!result_winner || !['a', 'b', 'draw'].includes(result_winner)) {
    return res.status(400).json({
      success: false,
      error: { message: 'result_winner must be "a", "b", or "draw"' },
    });
  }

  const { data: match, error: matchError } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('id', id)
    .single();

  if (matchError) return res.status(404).json({ success: false, error: { message: 'Match not found' } });

  const { data, error } = await supabaseAdmin
    .from('matches')
    .update({
      match_status: 'completed',
      result_winner,
      forced: true,
      force_reason: reason || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, error: { message: error.message } });

  await updateParticipantScores(match.competition_id, match.player_a_id, match.player_b_id, result_winner);

  res.json({ success: true, data });
};

exports.extendDeadline = async (req, res) => {
  const { id } = req.params;
  const { hours } = req.body;

  if (!hours || typeof hours !== 'number' || hours < 1 || hours > 168) {
    return res.status(400).json({
      success: false,
      error: { message: 'hours must be a number between 1 and 168' },
    });
  }

  const { data: match, error: matchError } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('id', id)
    .single();

  if (matchError) return res.status(404).json({ success: false, error: { message: 'Match not found' } });

  const previousDeadline = match.deadline;
  const newDeadline = new Date(
    (previousDeadline ? new Date(previousDeadline).getTime() : Date.now()) + hours * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabaseAdmin
    .from('matches')
    .update({ deadline: newDeadline })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, error: { message: error.message } });

  res.json({
    success: true,
    data: {
      id: data.id,
      previous_deadline: previousDeadline,
      new_deadline: newDeadline,
    },
  });
};

// ─── Helper ──────────────────────────────────────────────────────

async function updateParticipantScores(competitionId, playerAId, playerBId, winner) {
  // Get current participants
  const { data: participants } = await supabaseAdmin
    .from('competition_participants')
    .select('*')
    .eq('competition_id', competitionId)
    .in('user_id', [playerAId, playerBId]);

  if (!participants || participants.length === 0) return;

  const partA = participants.find((p) => p.user_id === playerAId);
  const partB = participants.find((p) => p.user_id === playerBId);

  if (winner === 'a') {
    if (partA) {
      await supabaseAdmin
        .from('competition_participants')
        .update({ score: Number(partA.score || 0) + 1, wins: (partA.wins || 0) + 1 })
        .eq('id', partA.id);
    }
    if (partB) {
      await supabaseAdmin
        .from('competition_participants')
        .update({ losses: (partB.losses || 0) + 1 })
        .eq('id', partB.id);
    }
  } else if (winner === 'b') {
    if (partB) {
      await supabaseAdmin
        .from('competition_participants')
        .update({ score: Number(partB.score || 0) + 1, wins: (partB.wins || 0) + 1 })
        .eq('id', partB.id);
    }
    if (partA) {
      await supabaseAdmin
        .from('competition_participants')
        .update({ losses: (partA.losses || 0) + 1 })
        .eq('id', partA.id);
    }
  } else if (winner === 'draw') {
    if (partA) {
      await supabaseAdmin
        .from('competition_participants')
        .update({
          score: Number(partA.score || 0) + 0.5,
          draws: (partA.draws || 0) + 1,
        })
        .eq('id', partA.id);
    }
    if (partB) {
      await supabaseAdmin
        .from('competition_participants')
        .update({
          score: Number(partB.score || 0) + 0.5,
          draws: (partB.draws || 0) + 1,
        })
        .eq('id', partB.id);
    }
  }
}