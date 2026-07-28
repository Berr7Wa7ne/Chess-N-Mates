// controllers/botController.js — Bot-specific API endpoints
const { supabaseAdmin } = require('../config/supabase');
const { emitWebhook, getWebhookUrl } = require('../services/webhookService');
const { timestamp } = require('../utils/competitionHelpers');

/**
 * GET /api/v1/bot/status
 * Returns a summary of what's happening right now:
 * - Active competition details
 * - Current round info
 * - Match counts (total, pending, completed)
 * - Player counts
 */
exports.getBotStatus = async (req, res) => {
  try {
    // Get active competition (if any)
    const { data: activeCompetition } = await supabaseAdmin
      .from('competitions')
      .select('*')
      .in('competition_status', ['open_registration', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let status = {
      server_time: new Date().toISOString(),
      has_active_competition: !!activeCompetition,
      competition: null,
      registration_open: false,
    };

    if (activeCompetition) {
      // Get participant count
      const { count: participantCount } = await supabaseAdmin
        .from('competition_participants')
        .select('*', { count: 'exact', head: true })
        .eq('competition_id', activeCompetition.id);

      // Get match stats if competition is active
      let matchStats = { total: 0, pending: 0, completed: 0, result_submitted: 0 };
      if (activeCompetition.competition_status === 'active') {
        const { data: matches } = await supabaseAdmin
          .from('matches')
          .select('match_status')
          .eq('competition_id', activeCompetition.id)
          .eq('round_number', activeCompetition.current_round);

        if (matches) {
          matchStats.total = matches.length;
          matchStats.pending = matches.filter(m => m.match_status === 'pending').length;
          matchStats.completed = matches.filter(m => m.match_status === 'completed').length;
          matchStats.result_submitted = matches.filter(m => m.match_status === 'result_submitted').length;
        }
      }

      status.competition = {
        id: activeCompetition.id,
        name: activeCompetition.name,
        type: activeCompetition.tournament_type,
        status: activeCompetition.competition_status,
        current_round: activeCompetition.current_round,
        total_rounds: activeCompetition.rounds,
        max_participants: activeCompetition.max_participants,
        participant_count: participantCount || 0,
        start_date: activeCompetition.start_date,
        end_date: activeCompetition.end_date,
      };

      status.registration_open = activeCompetition.competition_status === 'open_registration';
      status.match_stats = matchStats;
    }

    res.json({ success: true, data: status });
  } catch (err) {
    console.error('[BOT STATUS ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Failed to get bot status' } });
  }
};

/**
 * GET /api/v1/bot/players
 * Returns all users with their whatsapp_id and chess info.
 * Bot uses this to sync members.
 */
exports.getBotPlayers = async (req, res) => {
  try {
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, display_name, phone_number, whatsapp_id, chess_com_username, chess_username, chess_elo, chess_blitz_elo, chess_bullet_elo, role, created_at')
      .not('whatsapp_id', 'is', null)
      .order('display_name', { ascending: true });

    if (error) {
      return res.status(400).json({ success: false, error: { message: error.message } });
    }

    res.json({ success: true, data: users || [] });
  } catch (err) {
    console.error('[BOT PLAYERS ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch players' } });
  }
};

/**
 * GET /api/v1/bot/my-matches/:whatsappId
 * Returns the current/pending matches for a player identified by whatsapp_id.
 * Bot-friendly format with opponent info, deadlines, and status.
 */
exports.getMyMatches = async (req, res) => {
  const { whatsappId } = req.params;

  if (!whatsappId) {
    return res.status(400).json({ success: false, error: { message: 'whatsappId is required' } });
  }

  try {
    // Look up user by whatsapp_id
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, display_name, whatsapp_id')
      .eq('whatsapp_id', whatsappId)
      .maybeSingle();

    if (userError) {
      return res.status(400).json({ success: false, error: { message: userError.message } });
    }

    if (!user) {
      return res.json({ success: true, data: { user: null, matches: [] } });
    }

    // Get active competition
    const { data: activeComp } = await supabaseAdmin
      .from('competitions')
      .select('id, name, tournament_type, current_round, competition_status')
      .in('competition_status', ['open_registration', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activeComp) {
      return res.json({ success: true, data: { user, matches: [] } });
    }

    // Get matches where user is player_a or player_b
    const { data: matches, error: matchError } = await supabaseAdmin
      .from('matches')
      .select(`
        *,
        player_a:player_a_id(id, display_name, chess_com_username, chess_username, chess_elo),
        player_b:player_b_id(id, display_name, chess_com_username, chess_username, chess_elo)
      `)
      .eq('competition_id', activeComp.id)
      .or(`player_a_id.eq.${user.id},player_b_id.eq.${user.id}`)
      .order('round_number', { ascending: true })
      .order('id', { ascending: true });

    if (matchError) {
      return res.status(400).json({ success: false, error: { message: matchError.message } });
    }

    // Format matches for bot display
    const formattedMatches = (matches || []).map(m => {
      const isPlayerA = m.player_a_id === user.id;
      const opponent = isPlayerA ? m.player_b : m.player_a;
      const mySide = isPlayerA ? 'a' : 'b';

      let resultText = 'Pending';
      if (m.match_status === 'completed') {
        if (m.result_winner === 'draw') {
          resultText = 'Draw';
        } else if (m.result_winner === mySide) {
          resultText = 'You won';
        } else if (m.result_winner) {
          resultText = 'You lost';
        }
      } else if (m.match_status === 'result_submitted') {
        resultText = 'Result submitted, awaiting confirmation';
      }

      return {
        match_id: m.id,
        round: m.round_number,
        leg: m.leg || 1,
        opponent_name: opponent?.display_name || 'Unknown',
        opponent_chess_username: opponent?.chess_com_username || opponent?.chess_username || null,
        opponent_elo: opponent?.chess_elo || null,
        my_side: mySide,
        status: m.match_status,
        result: resultText,
        result_winner: m.result_winner,
        deadline: m.deadline,
        is_bye: m.is_bye || false,
        game_link: m.chess_game_link,
      };
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          display_name: user.display_name,
          whatsapp_id: user.whatsapp_id,
        },
        competition: {
          id: activeComp.id,
          name: activeComp.name,
          type: activeComp.tournament_type,
          current_round: activeComp.current_round,
          status: activeComp.competition_status,
        },
        matches: formattedMatches,
      },
    });
  } catch (err) {
    console.error('[BOT MY MATCHES ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch matches' } });
  }
};

/**
 * POST /api/v1/bot/lookup-user
 * Find a user by whatsapp_id OR chess_username.
 * Body: { whatsapp_id, chess_username }
 * At least one identifier must be provided.
 */
exports.lookupUser = async (req, res) => {
  const { whatsapp_id, chess_username } = req.body;

  if (!whatsapp_id && !chess_username) {
    return res.status(400).json({
      success: false,
      error: { message: 'Provide at least one of: whatsapp_id, chess_username' },
    });
  }

  try {
    let query = supabaseAdmin
      .from('users')
      .select('id, display_name, phone_number, whatsapp_id, chess_com_username, chess_username, chess_elo, chess_blitz_elo, chess_bullet_elo, role');

    if (whatsapp_id) {
      query = query.eq('whatsapp_id', whatsapp_id);
    } else if (chess_username) {
      // Check both chess_username and chess_com_username columns
      query = query.or(`chess_username.eq.${chess_username},chess_com_username.eq.${chess_username}`);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      return res.status(400).json({ success: false, error: { message: error.message } });
    }

    if (!data) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('[BOT LOOKUP ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Failed to lookup user' } });
  }
};

/**
 * POST /api/v1/bot/register-webhook
 * Register the bot's webhook URL for receiving events.
 * Body: { webhook_url }
 */
exports.registerWebhook = async (req, res) => {
  const { webhook_url } = req.body;

  if (!webhook_url) {
    return res.status(400).json({
      success: false,
      error: { message: 'webhook_url is required' },
    });
  }

  // Basic URL validation
  try {
    new URL(webhook_url);
  } catch {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid webhook URL format' },
    });
  }

  try {
    // Check if bot_settings table has the key
    const { data: existing } = await supabaseAdmin
      .from('bot_settings')
      .select('id')
      .eq('key', 'bot_webhook_url')
      .maybeSingle();

    if (existing) {
      // Update existing
      await supabaseAdmin
        .from('bot_settings')
        .update({ value: webhook_url, updated_at: new Date().toISOString() })
        .eq('key', 'bot_webhook_url');
    } else {
      // Insert new
      await supabaseAdmin
        .from('bot_settings')
        .insert({ key: 'bot_webhook_url', value: webhook_url });
    }

    res.json({
      success: true,
      data: {
        webhook_url,
        registered_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[BOT REGISTER WEBHOOK ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Failed to register webhook' } });
  }
};

/**
 * POST /api/v1/bot/unregister-webhook
 * Remove the bot's webhook URL.
 */
exports.unregisterWebhook = async (req, res) => {
  try {
    await supabaseAdmin
      .from('bot_settings')
      .update({ value: null, updated_at: new Date().toISOString() })
      .eq('key', 'bot_webhook_url');

    res.json({ success: true, data: { message: 'Webhook unregistered' } });
  } catch (err) {
    console.error('[BOT UNREGISTER WEBHOOK ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Failed to unregister webhook' } });
  }
};

/**
 * POST /api/v1/bot/import-members
 * Bulk create users (for CSV import from bot).
 * Body: { members: [{ phone_number, whatsapp_id, display_name, chess_com_username }] }
 */
exports.importMembers = async (req, res) => {
  const { members } = req.body;

  if (!members || !Array.isArray(members) || members.length === 0) {
    return res.status(400).json({
      success: false,
      error: { message: 'members array is required with at least one entry' },
    });
  }

  if (members.length > 500) {
    return res.status(400).json({
      success: false,
      error: { message: 'Maximum 500 members per import' },
    });
  }

  const results = { created: 0, skipped: 0, errors: [] };

  try {
    for (const member of members) {
      const { phone_number, whatsapp_id, display_name, chess_com_username } = member;

      if (!phone_number) {
        results.errors.push({ member, reason: 'phone_number is required' });
        continue;
      }

      // Check if user already exists by phone or whatsapp_id
      const { data: existing } = await supabaseAdmin
        .from('users')
        .select('id')
        .or(`phone_number.eq.${phone_number}${whatsapp_id ? `,whatsapp_id.eq.${whatsapp_id}` : ''}`)
        .maybeSingle();

      if (existing) {
        results.skipped++;
        continue;
      }

      const { error } = await supabaseAdmin
        .from('users')
        .insert({
          phone_number,
          whatsapp_id: whatsapp_id || null,
          display_name: display_name || chess_com_username || phone_number,
          email: `${phone_number}@import.temp`,
          chess_com_username: chess_com_username || null,
          role: 'player',
        });

      if (error) {
        results.errors.push({ member, reason: error.message });
      } else {
        results.created++;
      }
    }

    res.json({
      success: true,
      data: {
        created: results.created,
        skipped: results.skipped,
        errors: results.errors.length,
        error_details: results.errors,
      },
    });
  } catch (err) {
    console.error('[BOT IMPORT MEMBERS ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Failed to import members' } });
  }
};

/**
 * POST /api/v1/bot/update-activity
 * Update a user's last_activity_at timestamp.
 * Body: { whatsapp_id } or { user_id }
 */
exports.updateActivity = async (req, res) => {
  const { whatsapp_id, user_id } = req.body;

  if (!whatsapp_id && !user_id) {
    return res.status(400).json({
      success: false,
      error: { message: 'Provide either whatsapp_id or user_id' },
    });
  }

  try {
    const now = new Date().toISOString();
    let query = supabaseAdmin
      .from('users')
      .update({ last_activity_at: now });

    if (user_id) {
      query = query.eq('id', user_id);
    } else {
      query = query.eq('whatsapp_id', whatsapp_id);
    }

    const { error } = await query;

    if (error) {
      return res.status(400).json({ success: false, error: { message: error.message } });
    }

    res.json({ success: true, data: { updated_at: now } });
  } catch (err) {
    console.error('[BOT UPDATE ACTIVITY ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Failed to update activity' } });
  }
};