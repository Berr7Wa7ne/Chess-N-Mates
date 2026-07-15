const { supabase, supabaseAdmin } = require('../config/supabase');
const { timestamp } = require('../utils/competitionHelpers');
const { verifyGameAndDetermineWinner } = require('../services/chessComService');

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

  if (!user_id) {
    return res.status(400).json({
      success: false,
      error: { message: 'user_id is required' },
    });
  }

  // A chess_game_link is required for player result submission
  if (!chess_game_link) {
    return res.status(400).json({
      success: false,
      error: { message: 'chess.com game link is required to submit a result' },
    });
  }

  // If result_winner is provided, validate it
  if (result_winner && !['a', 'b', 'draw'].includes(result_winner)) {
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

  // ── Fetch competition for time control validation ──
  const { data: competition } = await supabaseAdmin
    .from('competitions')
    .select('time_control')
    .eq('id', match.competition_id)
    .single();

  // ── Ensure deadline is set for date validation ──
  // If no deadline exists, compute one from match.created_at + 24hrs
  // This mirrors the exact same logic used when matches are created
  // (see competitionsController.js: deadline = Date.now() + 24hrs)
  if (!match.deadline) {
    if (match.created_at) {
      const computedDeadline = new Date(
        new Date(match.created_at).getTime() + 24 * 60 * 60 * 1000
      ).toISOString();
      match = { ...match, deadline: computedDeadline };
    } else {
      return res.status(400).json({
        success: false,
        error: { message: 'Match has no deadline and cannot verify the game date. Please contact an admin.' },
      });
    }
  }

  // ── Fetch player chess.com usernames ──
  const { data: playerA } = await supabaseAdmin
    .from('users')
    .select('id, chess_com_username')
    .eq('id', match.player_a_id)
    .single();

  const { data: playerB } = await supabaseAdmin
    .from('users')
    .select('id, chess_com_username')
    .eq('id', match.player_b_id)
    .single();

  if (!playerA?.chess_com_username || !playerB?.chess_com_username) {
    return res.status(400).json({
      success: false,
      error: { message: 'Both players must have chess.com usernames linked to their accounts to submit a result' },
    });
  }

  // ── Verify the game link against all validation rules ──
  const verification = await verifyGameAndDetermineWinner(
    chess_game_link, playerA, playerB, competition, match
  );

  if (!verification.matched) {
    // Link failed validation — clear error message returned to the player
    return res.status(400).json({
      success: false,
      error: { message: `Game verification failed: ${verification.reason}` },
    });
  }

  // ── All validations passed — auto-score the match as completed ──
  const verifiedResult = verification.result_winner;

  const updates = {
    match_status: 'completed',
    result_winner: verifiedResult,
    result_submitted_by: user_id,
    result_submitted_at: timestamp(),
    chess_game_link: chess_game_link,
  };

  if (chess_game_id) updates.chess_game_id = chess_game_id;

  const { data, error } = await supabaseAdmin
    .from('matches')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, error: { message: error.message } });

  // Update participant scores immediately with the verified result
  await updateParticipantScores(match.competition_id, { ...match, result_winner: verifiedResult });

  res.json({
    success: true,
    data: {
      ...data,
      auto_scored: true,
      verified_result: verifiedResult,
    },
  });
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

  if (!absence_side || !['a', 'b', 'both'].includes(absence_side)) {
    return res.status(400).json({
      success: false,
      error: { message: 'absence_side must be "a", "b", or "both"' },
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

  // For 'both' absent, no winner — both get 0 points
  const resultWinner = absence_side === 'both' ? null : (absence_side === 'a' ? 'b' : 'a');

  const { data, error } = await supabaseAdmin
    .from('matches')
    .update({
      match_status: 'completed',
      result_winner: resultWinner,
      is_absent: true,
      is_both_absent: absence_side === 'both',
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
    is_both_absent: absence_side === 'both',
    absence_side,
    result_winner: resultWinner,
  });

  res.json({
    success: true,
    data: {
      ...data,
      action: 'marked_absent',
      absence_side,
      winner_side: resultWinner,
    },
  });
};

exports.forceResult = async (req, res) => {
  const { id } = req.params;
  const { result_winner, reason, is_absent, absence_side } = req.body;

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

  // If match was already completed, reverse the old scores first
  if (match.match_status === 'completed' && match.result_winner) {
    await reverseParticipantScores(match.competition_id, match);
  }

  const updates = {
    result_winner: result_winner,
    match_status: 'completed',
    forced: true,
    force_reason: reason || null,
    forced_at: new Date().toISOString(),
  };

  if (is_absent && absence_side) {
    updates.is_absent = true;
    updates.absence_side = absence_side;
  }

  const { data, error } = await supabaseAdmin
    .from('matches')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, error: { message: error.message } });

  await updateParticipantScores(match.competition_id, {
    ...match,
    result_winner,
    is_absent: is_absent || false,
    absence_side: is_absent ? absence_side : null,
  });

  // Auto-create a resolved audit record for every admin result change
  // This never blocks the match or creates a workflow interruption
  try {
    await supabaseAdmin.from('disputes').insert({
      match_id: match.id,
      competition_id: match.competition_id,
      raised_by_user_id: req.user?.id || match.created_by || null,
      opponent_user_id: null,
      filed_by_role: 'admin',
      category: 'other',
      reason: req.body.reason?.trim() || 'Admin result correction',
      description: `Result changed to: ${result_winner}`,
      dispute_status: 'resolved',
      admin_decision: 'overturned',
      admin_notes: req.body.reason?.trim() || null,
      resolved_by: req.user?.id || null,
      resolved_at: new Date().toISOString(),
    });
  } catch (auditError) {
    // Audit failure must never block the main operation
    console.error('Audit record creation failed:', auditError);
  }

  res.json({ success: true, data });
};

exports.adminScoreMatch = async (req, res) => {
  const { id } = req.params;
  const { result_winner, is_absent, absence_side } = req.body;

  if (!['a', 'b', 'draw'].includes(result_winner)) {
    return res.status(400).json({
      success: false,
      error: { message: 'result_winner must be a, b, or draw' },
    });
  }

  const { data: match, error: matchError } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('id', id)
    .single();

  if (matchError || !match) {
    return res.status(404).json({
      success: false,
      error: { message: 'Match not found' },
    });
  }

  if (!['pending', 'ongoing'].includes(match.match_status)) {
    return res.status(400).json({
      success: false,
      error: {
        message: `Cannot admin-score a match with status "${match.match_status}". Use force-result for completed matches.`,
      },
    });
  }

  const updates = {
    result_winner,
    match_status: 'completed',
    forced: false,
    result_submitted_at: new Date().toISOString(),
  };

  if (is_absent && absence_side) {
    updates.is_absent = true;
    updates.absence_side = absence_side;
  }

  const { data, error } = await supabaseAdmin
    .from('matches')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(400).json({
      success: false,
      error: { message: error.message },
    });
  }

  await updateParticipantScores(match.competition_id, {
    ...match,
    result_winner,
    is_absent: is_absent || false,
    absence_side: is_absent ? absence_side : null,
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
    if (match.absence_side === 'both') {
      // Both players absent — each gets 0 points, absences incremented
      if (partA) {
        await supabaseAdmin
          .from('competition_participants')
          .update({
            absences: (partA.absences || 0) + 1,
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
    } else if (match.absence_side === 'a') {
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
    if (match.absence_side === 'both') {
      // Previously: both got +1 absence each, no score changes
      if (partA) {
        await supabaseAdmin
          .from('competition_participants')
          .update({
            absences: Math.max(0, (partA.absences || 0) - 1),
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
    } else if (match.absence_side === 'a') {
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