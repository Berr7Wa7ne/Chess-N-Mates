const { supabase, supabaseAdmin } = require('../config/supabase');
const { timestamp } = require('../utils/competitionHelpers');

exports.getCompetitionMatches = async (req, res) => {
  const competitionId = req.params.competition_id || req.params.id;
  const { round, status, player_id } = req.query;

  let query = supabaseAdmin
    .from('matches')
    .select(`
      *,
      player_a:player_a_id(id, display_name, chess_username, chess_elo),
      player_b:player_b_id(id, display_name, chess_username, chess_elo)
    `)
    .eq('competition_id', competitionId)
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

  // Update participant scores with 2-1-0 system
  await updateParticipantScores(match.competition_id, match);

  res.json({
    success: true,
    data: {
      ...data,
      confirmed_at: timestamp(),
    },
  });
};

exports.markAbsent = async (req, res) => {
  const { id } = req.params;
  const { absence_side, user_id } = req.body;

  if (!absence_side || !['a', 'b'].includes(absence_side)) {
    return res.status(400).json({
      success: false,
      error: { message: 'absence_side must be "a" or "b"' },
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
      error: { message: 'Match status must be "pending" or "ongoing" to mark absent' },
    });
  }

  if (!user_id && absence_side) {
    // Admin marking - no user_id required for admin action
  }

  const { data, error } = await supabaseAdmin
    .from('matches')
    .update({
      match_status: 'completed',
      result_winner: absence_side === 'a' ? 'b' : 'a',
      is_absent: true,
      absence_side,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, error: { message: error.message } });

  // Update participant scores with absence
  await updateParticipantScores(match.competition_id, {
    ...match,
    is_absent: true,
    absence_side,
    result_winner: absence_side === 'a' ? 'b' : 'a',
  });

  res.json({
    success: true,
    data: {
      ...data,
      action: 'marked_absent',
      absence_side,
      winner_side: absence_side === 'a' ? 'b' : 'a',
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

  // If match was already completed/result_submitted, reverse the previous scores first
  if (
    (match.match_status === 'completed' || match.match_status === 'result_submitted') &&
    match.result_winner
  ) {
    await reverseParticipantScores(match.competition_id, match);
  }

  await updateParticipantScores(match.competition_id, {
    ...match,
    result_winner,
    is_absent: false,
    absence_side: null,
  });

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

async function updateParticipantScores(competitionId, match) {
  // Get current participants
  const { data: participants } = await supabaseAdmin
    .from('competition_participants')
    .select('*')
    .eq('competition_id', competitionId)
    .in('user_id', [match.player_a_id, match.player_b_id]);

  if (!participants || participants.length === 0) return;

  const partA = participants.find((p) => p.user_id === match.player_a_id);
  const partB = participants.find((p) => p.user_id === match.player_b_id);

  // Handle absence
  if (match.is_absent) {
    if (match.absence_side === 'a') {
      // Player A absent - B gets auto win (+2 pts)
      if (partB) {
        await supabaseAdmin
          .from('competition_participants')
          .update({
            score: Number(partB.score || 0) + 2,
            wins: (partB.wins || 0) + 1,
          })
          .eq('id', partB.id);
      }
      if (partA) {
        await supabaseAdmin
          .from('competition_participants')
          .update({
            absences: (partA.absences || 0) + 1,
          })
          .eq('id', partA.id);
      }
    } else if (match.absence_side === 'b') {
      // Player B absent - A gets auto win (+2 pts)
      if (partA) {
        await supabaseAdmin
          .from('competition_participants')
          .update({
            score: Number(partA.score || 0) + 2,
            wins: (partA.wins || 0) + 1,
          })
          .eq('id', partA.id);
      }
      if (partB) {
        await supabaseAdmin
          .from('competition_participants')
          .update({
            absences: (partB.absences || 0) + 1,
          })
          .eq('id', partB.id);
      }
    }
    return;
  }

  if (!match.result_winner) return;

  // 2-1-0 scoring system
  if (match.result_winner === 'a') {
    if (partA) {
      await supabaseAdmin
        .from('competition_participants')
        .update({
          score: Number(partA.score || 0) + 2,
          wins: (partA.wins || 0) + 1,
        })
        .eq('id', partA.id);
    }
    if (partB) {
      await supabaseAdmin
        .from('competition_participants')
        .update({
          losses: (partB.losses || 0) + 1,
        })
        .eq('id', partB.id);
    }
  } else if (match.result_winner === 'b') {
    if (partB) {
      await supabaseAdmin
        .from('competition_participants')
        .update({
          score: Number(partB.score || 0) + 2,
          wins: (partB.wins || 0) + 1,
        })
        .eq('id', partB.id);
    }
    if (partA) {
      await supabaseAdmin
        .from('competition_participants')
        .update({
          losses: (partA.losses || 0) + 1,
        })
        .eq('id', partA.id);
    }
  } else if (match.result_winner === 'draw') {
    if (partA) {
      await supabaseAdmin
        .from('competition_participants')
        .update({
          score: Number(partA.score || 0) + 1,
          draws: (partA.draws || 0) + 1,
        })
        .eq('id', partA.id);
    }
    if (partB) {
      await supabaseAdmin
        .from('competition_participants')
        .update({
          score: Number(partB.score || 0) + 1,
          draws: (partB.draws || 0) + 1,
        })
        .eq('id', partB.id);
    }
  }
}

// ─── Reverse Helper ───────────────────────────────────────────────

async function reverseParticipantScores(competitionId, match) {
  const { data: participants } = await supabaseAdmin
    .from('competition_participants')
    .select('*')
    .eq('competition_id', competitionId)
    .in('user_id', [match.player_a_id, match.player_b_id]);

  if (!participants || participants.length === 0) return;

  const partA = participants.find((p) => p.user_id === match.player_a_id);
  const partB = participants.find((p) => p.user_id === match.player_b_id);

  // Handle reversal of absence scoring
  if (match.is_absent) {
    if (match.absence_side === 'a') {
      // Previously: B got +2 pts +1 win; A got +1 absence
      if (partB) {
        await supabaseAdmin
          .from('competition_participants')
          .update({
            score: Math.max(0, Number(partB.score || 0) - 2),
            wins: Math.max(0, (partB.wins || 0) - 1),
          })
          .eq('id', partB.id);
      }
      if (partA) {
        await supabaseAdmin
          .from('competition_participants')
          .update({
            absences: Math.max(0, (partA.absences || 0) - 1),
          })
          .eq('id', partA.id);
      }
    } else if (match.absence_side === 'b') {
      // Previously: A got +2 pts +1 win; B got +1 absence
      if (partA) {
        await supabaseAdmin
          .from('competition_participants')
          .update({
            score: Math.max(0, Number(partA.score || 0) - 2),
            wins: Math.max(0, (partA.wins || 0) - 1),
          })
          .eq('id', partA.id);
      }
      if (partB) {
        await supabaseAdmin
          .from('competition_participants')
          .update({
            absences: Math.max(0, (partB.absences || 0) - 1),
          })
          .eq('id', partB.id);
      }
    }
    return;
  }

  if (!match.result_winner) return;

  // Reverse 2-1-0 scoring
  if (match.result_winner === 'a') {
    // Previously: A got +2 pts +1 win; B got +1 loss
    if (partA) {
      await supabaseAdmin
        .from('competition_participants')
        .update({
          score: Math.max(0, Number(partA.score || 0) - 2),
          wins: Math.max(0, (partA.wins || 0) - 1),
        })
        .eq('id', partA.id);
    }
    if (partB) {
      await supabaseAdmin
        .from('competition_participants')
        .update({
          losses: Math.max(0, (partB.losses || 0) - 1),
        })
        .eq('id', partB.id);
    }
  } else if (match.result_winner === 'b') {
    // Previously: B got +2 pts +1 win; A got +1 loss
    if (partB) {
      await supabaseAdmin
        .from('competition_participants')
        .update({
          score: Math.max(0, Number(partB.score || 0) - 2),
          wins: Math.max(0, (partB.wins || 0) - 1),
        })
        .eq('id', partB.id);
    }
    if (partA) {
      await supabaseAdmin
        .from('competition_participants')
        .update({
          losses: Math.max(0, (partA.losses || 0) - 1),
        })
        .eq('id', partA.id);
    }
  } else if (match.result_winner === 'draw') {
    // Previously: both got +1 pt +1 draw
    if (partA) {
      await supabaseAdmin
        .from('competition_participants')
        .update({
          score: Math.max(0, Number(partA.score || 0) - 1),
          draws: Math.max(0, (partA.draws || 0) - 1),
        })
        .eq('id', partA.id);
    }
    if (partB) {
      await supabaseAdmin
        .from('competition_participants')
        .update({
          score: Math.max(0, Number(partB.score || 0) - 1),
          draws: Math.max(0, (partB.draws || 0) - 1),
        })
        .eq('id', partB.id);
    }
  }
}
