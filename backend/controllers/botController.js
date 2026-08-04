// controllers/botController.js — Bot-specific API endpoints
const { supabaseAdmin } = require('../config/supabase');
const { emitWebhook, getWebhookUrl } = require('../services/webhookService');
const { timestamp } = require('../utils/competitionHelpers');
const {
  getParticipantCount,
  attachParticipantCounts,
  fetchParticipantsWithUsers,
  isRegistrationOpen,
} = require('../utils/competitionHelpers');
const { generateFixtures } = require('../services/fixtureGenerator');
const { computeStandings } = require('../services/standingsService');

// ============================================
// SHARED HELPERS
// ============================================

/**
 * Look up a user by phone_number, whatsapp_id, or lid.
 * The bot may send any of these identifiers depending on what it has.
 * @param {object} identifiers - { phone_number, whatsapp_id, lid }
 * @returns {object|null} user data or null
 */
async function lookupUserByIdentifier({ phone_number, whatsapp_id, lid }) {
  let query = supabaseAdmin
    .from('users')
    .select('id, display_name, phone_number, whatsapp_id, chess_com_username, chess_username, chess_elo, role, user_status');

  if (phone_number) {
    query = query.eq('phone_number', phone_number);
  } else if (whatsapp_id) {
    query = query.eq('whatsapp_id', whatsapp_id);
  } else if (lid) {
    // Try whatsapp_id first (lid might be stored there), then check a lid column if it exists
    query = query.eq('whatsapp_id', lid);
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error('[BOT LOOKUP ERROR]', error.message);
    return null;
  }
  return data;
}

/**
 * Look up a user and verify they are an admin.
 * @param {object} identifiers - { phone_number, whatsapp_id, lid }
 * @returns {{ user: object, error: string|null }}
 */
async function requireAdmin(identifiers) {
  const user = await lookupUserByIdentifier(identifiers);
  if (!user) {
    return { user: null, error: 'User not found. Please register first.' };
  }
  if (user.role !== 'admin') {
    return { user: null, error: 'Admin access required for this command.' };
  }
  return { user, error: null };
}

/**
 * Get the active or open_registration competition.
 * @param {string} competitionId - optional specific ID
 * @returns {object|null}
 */
async function getActiveCompetition(competitionId) {
  if (competitionId) {
    const { data, error } = await supabaseAdmin
      .from('competitions')
      .select('*')
      .eq('id', competitionId)
      .single();
    if (error) return null;
    return data;
  }

  const { data } = await supabaseAdmin
    .from('competitions')
    .select('*')
    .in('competition_status', ['open_registration', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data || null;
}

/**
 * Parse a command string like "round-robin-single" into tournament config.
 * @param {string} command - e.g. "round-robin-single"
 * @returns {{ tournament_type, match_length, format_match_rules, round_robin_legs }}
 */
function parseCompStartCommand(command) {
  const parts = (command || '').toLowerCase().split('-');
  const type = parts[0]; // round, swiss, knockout
  const format = parts.slice(1).join('-'); // robin-single, robin-double, single, double, best-of-3

  let tournament_type, match_length, format_match_rules, round_robin_legs;

  if (type === 'round' && parts[1] === 'robin') {
    tournament_type = 'round_robin';
    if (format.includes('double')) {
      match_length = 'double_game';
      format_match_rules = 'double_leg';
      round_robin_legs = 2;
    } else {
      match_length = 'single_game';
      format_match_rules = 'single_leg';
      round_robin_legs = 1;
    }
  } else if (type === 'swiss') {
    tournament_type = 'swiss';
    if (format.includes('double')) {
      match_length = 'double_game';
      format_match_rules = 'two_game_round';
    } else {
      match_length = 'single_game';
      format_match_rules = 'single_game_per_round';
    }
    round_robin_legs = 1;
  } else if (type === 'knockout') {
    tournament_type = 'knockout';
    if (format.includes('best-of-3')) {
      match_length = 'best_of_3';
      format_match_rules = 'two_game_match';
    } else if (format.includes('best-of-5')) {
      match_length = 'best_of_5';
      format_match_rules = 'two_game_match';
    } else {
      match_length = 'single_game';
      format_match_rules = 'single_elimination';
    }
    round_robin_legs = 1;
  } else {
    return null;
  }

  return { tournament_type, match_length, format_match_rules, round_robin_legs };
}

/**
 * Compute rounds based on tournament type and player count.
 */
function computeRounds(tournamentType, maxPlayers) {
  if (tournamentType === 'knockout') {
    return Math.max(1, Math.ceil(Math.log2(maxPlayers)));
  }
  if (tournamentType === 'round_robin') {
    return maxPlayers < 2 ? 0 : maxPlayers - 1;
  }
  return 5; // Swiss default
}

// ============================================
// EXISTING ENDPOINTS
// ============================================

/**
 * GET /api/v1/bot/status
 */
exports.getBotStatus = async (req, res) => {
  try {
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
      const { count: participantCount } = await supabaseAdmin
        .from('competition_participants')
        .select('*', { count: 'exact', head: true })
        .eq('competition_id', activeCompetition.id);

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
 */
exports.getMyMatches = async (req, res) => {
  const { whatsappId } = req.params;

  if (!whatsappId) {
    return res.status(400).json({ success: false, error: { message: 'whatsappId is required' } });
  }

  try {
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
 */
exports.lookupUser = async (req, res) => {
  const { whatsapp_id, chess_username, phone_number } = req.body;

  if (!whatsapp_id && !chess_username && !phone_number) {
    return res.status(400).json({
      success: false,
      error: { message: 'Provide at least one of: whatsapp_id, chess_username, phone_number' },
    });
  }

  try {
    let query = supabaseAdmin
      .from('users')
      .select('id, display_name, phone_number, whatsapp_id, chess_com_username, chess_username, chess_elo, chess_blitz_elo, chess_bullet_elo, role');

    if (phone_number) {
      query = query.eq('phone_number', phone_number);
    } else if (whatsapp_id) {
      query = query.eq('whatsapp_id', whatsapp_id);
    } else if (chess_username) {
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
 */
exports.registerWebhook = async (req, res) => {
  const { webhook_url } = req.body;

  if (!webhook_url) {
    return res.status(400).json({
      success: false,
      error: { message: 'webhook_url is required' },
    });
  }

  try {
    new URL(webhook_url);
  } catch {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid webhook URL format' },
    });
  }

  try {
    const { data: existing } = await supabaseAdmin
      .from('bot_settings')
      .select('id')
      .eq('key', 'bot_webhook_url')
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from('bot_settings')
        .update({ value: webhook_url, updated_at: new Date().toISOString() })
        .eq('key', 'bot_webhook_url');
    } else {
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
 */
exports.updateActivity = async (req, res) => {
  const { whatsapp_id, user_id, phone_number } = req.body;

  if (!whatsapp_id && !user_id && !phone_number) {
    return res.status(400).json({
      success: false,
      error: { message: 'Provide either whatsapp_id, user_id, or phone_number' },
    });
  }

  try {
    const now = new Date().toISOString();
    let query = supabaseAdmin
      .from('users')
      .update({ last_activity_at: now });

    if (user_id) {
      query = query.eq('id', user_id);
    } else if (phone_number) {
      query = query.eq('phone_number', phone_number);
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

// ============================================
// NEW: ADMIN COMMANDS
// ============================================

/**
 * POST /api/v1/bot/comp-create
 * Admin creates a competition and opens registration immediately.
 *
 * Body: {
 *   phone_number: "2348140415169",           // Admin's phone number
 *   command: "round-robin-single",            // Parsed command string
 *   name: "Chess Tournament - August 2026",   // Optional, defaults generated
 *   description: "Monthly tournament",        // Optional
 *   time_control: "5+0",                      // Optional, defaults to "5+0"
 *   min_elo: 900,                              // Optional, defaults to 900
 *   max_elo: 3000,                             // Optional, defaults to 3000
 *   max_participants: 50,                     // Optional, defaults to 50
 *   registration_close_hours: 24,             // Optional, hours from now until reg closes
 *   start_in_hours: 24,                        // Optional, hours from now until competition starts
 *   duration_days: 30,                         // Optional, days from start to end
 * }
 */
exports.compCreate = async (req, res) => {
  try {
    const { phone_number, whatsapp_id, lid, command, name, description, time_control, min_elo, max_elo, max_participants, registration_close_hours, start_in_hours, duration_days } = req.body;

    // Verify admin
    const { user, error: adminError } = await requireAdmin({ phone_number, whatsapp_id, lid });
    if (adminError) {
      return res.status(403).json({ success: false, error: { message: adminError } });
    }

    // Parse command string
    const parsed = parseCompStartCommand(command);
    if (!parsed) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid command format. Use: round-robin-single, round-robin-double, swiss-single, swiss-double, knockout-single, knockout-best-of-3, knockout-best-of-5',
        },
      });
    }

    const { tournament_type, match_length, format_match_rules, round_robin_legs } = parsed;

    // Set defaults
    const maxPlayers = max_participants || 50;
    const rounds = computeRounds(tournament_type, maxPlayers);
    const now = new Date();
    const regCloseHours = registration_close_hours || 24;
    const startHours = start_in_hours || 24;
    const durationDays = duration_days || 30;

    const regOpenAt = now.toISOString();
    const regCloseAt = new Date(now.getTime() + regCloseHours * 60 * 60 * 1000).toISOString();
    const startDate = new Date(now.getTime() + startHours * 60 * 60 * 1000).toISOString();
    const endDate = new Date(new Date(startDate).getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    const compName = name || `Chess Tournament - ${now.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`;

    const { data, error } = await supabaseAdmin
      .from('competitions')
      .insert([{
        name: compName,
        description: description || 'Chess community tournament',
        tournament_type,
        competition_status: 'open_registration',
        registration_open_at: regOpenAt,
        registration_close_at: regCloseAt,
        start_date: startDate,
        end_date: endDate,
        max_participants: maxPlayers,
        rounds,
        min_elo: min_elo || 900,
        max_elo: max_elo || 3000,
        time_control: time_control || '5+0',
        timezone: 'UTC+1:00',
        platform: 'chess.com',
        match_length,
        format_match_rules,
        round_robin_legs,
        rules: [],
        created_by: user.id,
        current_round: 0,
      }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: { message: error.message } });
    }

    // Emit webhook
    emitWebhook('competition.created', {
      competition_id: data.id,
      name: data.name,
      tournament_type,
      match_length,
      time_control: data.time_control,
      min_elo: data.min_elo,
      max_elo: data.max_elo,
      max_participants: maxPlayers,
      registration_open: true,
    });

    res.status(201).json({
      success: true,
      data: {
        ...data,
        participant_count: 0,
        message: `Competition "${compName}" created and registration is now open!`,
      },
    });
  } catch (err) {
    console.error('[BOT COMP CREATE ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Failed to create competition' } });
  }
};

/**
 * POST /api/v1/bot/comp-begin
 * Admin starts the tournament — generates fixtures and sets status to active.
 *
 * Body: {
 *   phone_number: "2348140415169",
 *   competition_id: "uuid",  // Optional, defaults to the open_registration competition
 * }
 */
exports.compBegin = async (req, res) => {
  try {
    const { phone_number, whatsapp_id, lid, competition_id } = req.body;

    const { user, error: adminError } = await requireAdmin({ phone_number, whatsapp_id, lid });
    if (adminError) {
      return res.status(403).json({ success: false, error: { message: adminError } });
    }

    const competition = await getActiveCompetition(competition_id);
    if (!competition) {
      return res.status(404).json({ success: false, error: { message: 'No competition found to start.' } });
    }

    if (competition.competition_status !== 'open_registration') {
      return res.status(400).json({
        success: false,
        error: { message: `Competition status is "${competition.competition_status}", must be "open_registration" to start.` },
      });
    }

    // Get registered participants
    const participants = await fetchParticipantsWithUsers(competition.id);
    const eligible = participants.filter((p) => p.participant_status === 'registered');

    if (eligible.length < 2) {
      return res.status(400).json({
        success: false,
        error: { message: `Not enough participants (minimum 2, currently ${eligible.length}).` },
      });
    }

    // Check for existing matches
    const { data: existingMatches } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('competition_id', competition.id);

    // Generate fixtures
    const fixtures = generateFixtures(competition, eligible, existingMatches || [], [], 1);

    const deadlineDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const matchRows = fixtures
      .filter((f) => f.player_a_id && f.player_b_id)
      .map((f) => ({
        competition_id: competition.id,
        round_number: f.round_number || 1,
        player_a_id: f.player_a_id,
        player_b_id: f.player_b_id,
        match_status: f.is_bye ? 'completed' : 'pending',
        is_bye: f.is_bye || false,
        leg: f.leg || 1,
        deadline: f.is_bye ? null : deadlineDate,
      }));

    if (matchRows.length > 0) {
      const { error: matchError } = await supabaseAdmin.from('matches').insert(matchRows);
      if (matchError) {
        return res.status(400).json({ success: false, error: { message: matchError.message } });
      }
    }

    // Update participants to active
    await supabaseAdmin
      .from('competition_participants')
      .update({ participant_status: 'active' })
      .eq('competition_id', competition.id)
      .eq('participant_status', 'registered');

    // Update competition status
    const { error: updateError } = await supabaseAdmin
      .from('competitions')
      .update({ competition_status: 'active', current_round: 1 })
      .eq('id', competition.id);

    if (updateError) {
      return res.status(400).json({ success: false, error: { message: updateError.message } });
    }

    emitWebhook('competition.started', {
      competition_id: competition.id,
      name: competition.name,
      round: 1,
      fixtures_generated: matchRows.length,
      participant_count: eligible.length,
    });

    res.json({
      success: true,
      data: {
        competition_id: competition.id,
        competition_name: competition.name,
        action: 'started',
        round: 1,
        fixtures_generated: matchRows.length,
        participant_count: eligible.length,
        timestamp: timestamp(),
      },
    });
  } catch (err) {
    console.error('[BOT COMP BEGIN ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Failed to start competition' } });
  }
};

/**
 * POST /api/v1/bot/comp-advance
 * Admin advances to the next round.
 *
 * Body: {
 *   phone_number: "2348140415169",
 *   competition_id: "uuid",           // Optional
 *   include_pending_matches: false,    // Optional, force advance even with unresolved matches
 * }
 */
exports.compAdvance = async (req, res) => {
  try {
    const { phone_number, whatsapp_id, lid, competition_id, include_pending_matches } = req.body;

    const { user, error: adminError } = await requireAdmin({ phone_number, whatsapp_id, lid });
    if (adminError) {
      return res.status(403).json({ success: false, error: { message: adminError } });
    }

    const competition = await getActiveCompetition(competition_id);
    if (!competition) {
      return res.status(404).json({ success: false, error: { message: 'No active competition found.' } });
    }

    if (competition.competition_status !== 'active') {
      return res.status(400).json({ success: false, error: { message: 'Competition is not active.' } });
    }

    const currentRound = competition.current_round || 1;

    // Check for unresolved matches
    const { data: roundMatches } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('competition_id', competition.id)
      .eq('round_number', currentRound);

    const unresolved = (roundMatches || []).filter((m) => m.match_status !== 'completed');

    if (unresolved.length > 0 && !include_pending_matches) {
      return res.status(400).json({
        success: false,
        error: { message: `${unresolved.length} match(es) in round ${currentRound} are not completed. Use include_pending_matches: true to force advance.` },
      });
    }

    const nextRound = currentRound + 1;
    const maxRounds = competition.rounds || 1;

    // Check if competition is complete
    if (nextRound > maxRounds && competition.tournament_type !== 'knockout') {
      await supabaseAdmin
        .from('competitions')
        .update({ competition_status: 'completed', end_date: timestamp() })
        .eq('id', competition.id);

      return res.json({
        success: true,
        data: {
          competition_id: competition.id,
          action: 'completed',
          previous_round: currentRound,
          current_round: currentRound,
          timestamp: timestamp(),
        },
      });
    }

    // Generate next round fixtures
    const participants = await fetchParticipantsWithUsers(competition.id);
    const { data: allMatches } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('competition_id', competition.id);

    const completedMatches = (allMatches || []).filter((m) => m.match_status === 'completed');

    // Handle knockout
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
          .eq('id', competition.id);

        return res.json({
          success: true,
          data: {
            competition_id: competition.id,
            action: 'completed',
            previous_round: currentRound,
            timestamp: timestamp(),
          },
        });
      }
    }

    const fixtures = generateFixtures(competition, participants, allMatches || [], completedMatches, nextRound);

    const deadlineDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const matchRows = fixtures
      .filter((f) => f.player_a_id && f.player_b_id)
      .map((f) => ({
        competition_id: competition.id,
        round_number: f.round_number || nextRound,
        player_a_id: f.player_a_id,
        player_b_id: f.player_b_id,
        match_status: 'pending',
        leg: f.leg || 1,
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
      .eq('id', competition.id);

    emitWebhook('round.advanced', {
      competition_id: competition.id,
      name: competition.name,
      previous_round: currentRound,
      current_round: nextRound,
      fixtures_generated: matchRows.length,
    });

    res.json({
      success: true,
      data: {
        competition_id: competition.id,
        action: 'advanced',
        previous_round: currentRound,
        current_round: nextRound,
        fixtures_generated: matchRows.length,
        unresolved_matches: unresolved.length,
        timestamp: timestamp(),
      },
    });
  } catch (err) {
    console.error('[BOT COMP ADVANCE ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Failed to advance round' } });
  }
};

/**
 * POST /api/v1/bot/comp-delete
 * Admin deletes a competition.
 *
 * Body: { phone_number, competition_id }
 */
exports.compDelete = async (req, res) => {
  try {
    const { phone_number, whatsapp_id, lid, competition_id } = req.body;

    const { user, error: adminError } = await requireAdmin({ phone_number, whatsapp_id, lid });
    if (adminError) {
      return res.status(403).json({ success: false, error: { message: adminError } });
    }

    if (!competition_id) {
      return res.status(400).json({ success: false, error: { message: 'competition_id is required' } });
    }

    const { data: competition, error: compError } = await supabaseAdmin
      .from('competitions')
      .select('id, name, competition_status')
      .eq('id', competition_id)
      .single();

    if (compError) {
      return res.status(404).json({ success: false, error: { message: 'Competition not found' } });
    }

    // Delete related records
    await supabaseAdmin.from('competition_participants').delete().eq('competition_id', competition_id);

    const { data: competitionMatches } = await supabaseAdmin
      .from('matches')
      .select('id')
      .eq('competition_id', competition_id);

    if (competitionMatches && competitionMatches.length > 0) {
      const matchIds = competitionMatches.map(m => m.id);
      await supabaseAdmin.from('disputes').delete().in('match_id', matchIds);
    }

    await supabaseAdmin.from('matches').delete().eq('competition_id', competition_id);
    await supabaseAdmin.from('competitions').delete().eq('id', competition_id);

    res.json({
      success: true,
      data: {
        competition_id,
        competition_name: competition.name,
        deleted: true,
        timestamp: timestamp(),
      },
    });
  } catch (err) {
    console.error('[BOT COMP DELETE ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Failed to delete competition' } });
  }
};

/**
 * POST /api/v1/bot/force-result
 * Admin forces a match result.
 *
 * Body: { phone_number, match_id, result_winner, reason?, is_absent?, absence_side? }
 */
exports.forceResult = async (req, res) => {
  try {
    const { phone_number, whatsapp_id, lid, match_id, result_winner, reason, is_absent, absence_side } = req.body;

    const { user, error: adminError } = await requireAdmin({ phone_number, whatsapp_id, lid });
    if (adminError) {
      return res.status(403).json({ success: false, error: { message: adminError } });
    }

    if (!match_id || !result_winner) {
      return res.status(400).json({ success: false, error: { message: 'match_id and result_winner are required' } });
    }

    if (!['a', 'b', 'draw'].includes(result_winner)) {
      return res.status(400).json({ success: false, error: { message: 'result_winner must be "a", "b", or "draw"' } });
    }

    const { data: match, error: matchError } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('id', match_id)
      .single();

    if (matchError) {
      return res.status(404).json({ success: false, error: { message: 'Match not found' } });
    }

    // Reverse old scores if match was already completed
    if (match.match_status === 'completed' && match.result_winner) {
      await reverseParticipantScores(match.competition_id, match);
    }

    const updates = {
      result_winner,
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
      .eq('id', match_id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: { message: error.message } });
    }

    await updateParticipantScores(match.competition_id, {
      ...match,
      result_winner,
      is_absent: is_absent || false,
      absence_side: is_absent ? absence_side : null,
    });

    emitWebhook('match.force_result', {
      match_id,
      competition_id: match.competition_id,
      result_winner,
      reason: reason || null,
      forced: true,
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('[BOT FORCE RESULT ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Failed to force result' } });
  }
};

/**
 * POST /api/v1/bot/mark-absent
 * Admin marks a player absent.
 *
 * Body: { phone_number, match_id, absence_side }
 */
exports.markAbsent = async (req, res) => {
  try {
    const { phone_number, whatsapp_id, lid, match_id, absence_side } = req.body;

    const { user, error: adminError } = await requireAdmin({ phone_number, whatsapp_id, lid });
    if (adminError) {
      return res.status(403).json({ success: false, error: { message: adminError } });
    }

    if (!match_id || !absence_side || !['a', 'b', 'both'].includes(absence_side)) {
      return res.status(400).json({ success: false, error: { message: 'match_id and absence_side (a, b, or both) are required' } });
    }

    const { data: match, error: matchError } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('id', match_id)
      .single();

    if (matchError) {
      return res.status(404).json({ success: false, error: { message: 'Match not found' } });
    }

    if (match.match_status !== 'pending' && match.match_status !== 'ongoing') {
      return res.status(400).json({ success: false, error: { message: 'Match must be pending or ongoing to mark absent' } });
    }

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
      .eq('id', match_id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: { message: error.message } });
    }

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
  } catch (err) {
    console.error('[BOT MARK ABSENT ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Failed to mark absent' } });
  }
};

/**
 * POST /api/v1/bot/extend-deadline
 * Admin extends a match deadline.
 *
 * Body: { phone_number, match_id, hours }
 */
exports.extendDeadline = async (req, res) => {
  try {
    const { phone_number, whatsapp_id, lid, match_id, hours } = req.body;

    const { user, error: adminError } = await requireAdmin({ phone_number, whatsapp_id, lid });
    if (adminError) {
      return res.status(403).json({ success: false, error: { message: adminError } });
    }

    if (!match_id || !hours || typeof hours !== 'number' || hours < 1 || hours > 168) {
      return res.status(400).json({ success: false, error: { message: 'match_id and hours (1-168) are required' } });
    }

    const { data: match, error: matchError } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('id', match_id)
      .single();

    if (matchError) {
      return res.status(404).json({ success: false, error: { message: 'Match not found' } });
    }

    const previousDeadline = match.deadline;
    const newDeadline = new Date(
      (previousDeadline ? new Date(previousDeadline).getTime() : Date.now()) + hours * 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await supabaseAdmin
      .from('matches')
      .update({ deadline: newDeadline })
      .eq('id', match_id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: { message: error.message } });
    }

    res.json({
      success: true,
      data: {
        id: data.id,
        previous_deadline: previousDeadline,
        new_deadline: newDeadline,
        hours_extended: hours,
      },
    });
  } catch (err) {
    console.error('[BOT EXTEND DEADLINE ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Failed to extend deadline' } });
  }
};

/**
 * POST /api/v1/bot/admin-score
 * Admin scores a pending/ongoing match.
 *
 * Body: { phone_number, match_id, result_winner, is_absent?, absence_side? }
 */
exports.adminScoreMatch = async (req, res) => {
  try {
    const { phone_number, whatsapp_id, lid, match_id, result_winner, is_absent, absence_side } = req.body;

    const { user, error: adminError } = await requireAdmin({ phone_number, whatsapp_id, lid });
    if (adminError) {
      return res.status(403).json({ success: false, error: { message: adminError } });
    }

    if (!match_id || !['a', 'b', 'draw'].includes(result_winner)) {
      return res.status(400).json({ success: false, error: { message: 'match_id and result_winner (a, b, or draw) are required' } });
    }

    const { data: match, error: matchError } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('id', match_id)
      .single();

    if (matchError || !match) {
      return res.status(404).json({ success: false, error: { message: 'Match not found' } });
    }

    if (!['pending', 'ongoing'].includes(match.match_status)) {
      return res.status(400).json({
        success: false,
        error: { message: `Cannot admin-score a match with status "${match.match_status}". Use force-result for completed matches.` },
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
      .eq('id', match_id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: { message: error.message } });
    }

    await updateParticipantScores(match.competition_id, {
      ...match,
      result_winner,
      is_absent: is_absent || false,
      absence_side: is_absent ? absence_side : null,
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('[BOT ADMIN SCORE ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Failed to admin score match' } });
  }
};

/**
 * GET /api/v1/bot/disputes
 * Admin views disputes.
 *
 * Query: { competition_id, status, limit, offset }
 */
exports.getDisputes = async (req, res) => {
  try {
    const { phone_number, whatsapp_id, lid } = req.query;
    const { competition_id, status, limit = 50, offset = 0 } = req.query;

    const { user, error: adminError } = await requireAdmin({ phone_number, whatsapp_id, lid });
    if (adminError) {
      return res.status(403).json({ success: false, error: { message: adminError } });
    }

    let query = supabaseAdmin
      .from('disputes')
      .select(`
        *,
        match:matches(
          id, round_number, result_winner, match_status,
          player_a:users!matches_player_a_id_fkey(id, display_name, chess_com_username),
          player_b:users!matches_player_b_id_fkey(id, display_name, chess_com_username)
        ),
        competition:competitions(id, name),
        raised_by:users!disputes_raised_by_user_id_fkey(id, display_name, chess_com_username)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (competition_id) query = query.eq('competition_id', competition_id);
    if (status) query = query.eq('dispute_status', status);

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({ success: false, error: { message: error.message } });
    }

    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[BOT GET DISPUTES ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch disputes' } });
  }
};

/**
 * POST /api/v1/bot/resolve-dispute
 * Admin resolves a dispute.
 *
 * Body: { phone_number, dispute_id, admin_decision, admin_notes?, new_result_winner? }
 */
exports.resolveDispute = async (req, res) => {
  try {
    const { phone_number, whatsapp_id, lid, dispute_id, admin_decision, admin_notes, new_result_winner } = req.body;

    const { user, error: adminError } = await requireAdmin({ phone_number, whatsapp_id, lid });
    if (adminError) {
      return res.status(403).json({ success: false, error: { message: adminError } });
    }

    if (!dispute_id || !admin_decision) {
      return res.status(400).json({ success: false, error: { message: 'dispute_id and admin_decision are required' } });
    }

    if (!['upheld', 'overturned', 'draw'].includes(admin_decision)) {
      return res.status(400).json({ success: false, error: { message: 'admin_decision must be upheld, overturned, or draw' } });
    }

    if (['overturned', 'draw'].includes(admin_decision) && !new_result_winner) {
      return res.status(400).json({ success: false, error: { message: 'new_result_winner required when overturning result' } });
    }

    const { data: dispute, error: disputeError } = await supabaseAdmin
      .from('disputes')
      .select('*, match:matches(*)')
      .eq('id', dispute_id)
      .single();

    if (disputeError) {
      return res.status(404).json({ success: false, error: { message: 'Dispute not found' } });
    }

    // Reverse old scores and apply new result if overturning
    if (['overturned', 'draw'].includes(admin_decision)) {
      const match = dispute.match;
      if (match.match_status === 'completed' || match.match_status === 'disputed') {
        if (match.result_winner) {
          await reverseParticipantScores(match.competition_id, match);
        }
      }
      await supabaseAdmin
        .from('matches')
        .update({
          result_winner: new_result_winner,
          match_status: 'completed',
          forced: true,
          force_reason: `Dispute resolved: ${admin_notes || admin_decision}`,
        })
        .eq('id', match.id);

      await updateParticipantScores(match.competition_id, { ...match, result_winner: new_result_winner });
    } else {
      // Upheld — keep original result, just mark match as completed
      await supabaseAdmin
        .from('matches')
        .update({ match_status: 'completed' })
        .eq('id', dispute.match_id);
    }

    const { data, error } = await supabaseAdmin
      .from('disputes')
      .update({
        dispute_status: 'resolved',
        admin_decision,
        admin_notes: admin_notes || null,
        resolved_by: user.id,
        resolved_at: timestamp(),
      })
      .eq('id', dispute_id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: { message: error.message } });
    }

    emitWebhook('dispute.resolved', {
      dispute_id,
      match_id: dispute.match_id,
      competition_id: dispute.competition_id,
      admin_decision,
      new_result_winner: new_result_winner || null,
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('[BOT RESOLVE DISPUTE ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Failed to resolve dispute' } });
  }
};

/**
 * POST /api/v1/bot/reject-dispute
 * Admin rejects a dispute.
 *
 * Body: { phone_number, dispute_id, admin_notes? }
 */
exports.rejectDispute = async (req, res) => {
  try {
    const { phone_number, whatsapp_id, lid, dispute_id, admin_notes } = req.body;

    const { user, error: adminError } = await requireAdmin({ phone_number, whatsapp_id, lid });
    if (adminError) {
      return res.status(403).json({ success: false, error: { message: adminError } });
    }

    if (!dispute_id) {
      return res.status(400).json({ success: false, error: { message: 'dispute_id is required' } });
    }

    const { data: dispute } = await supabaseAdmin
      .from('disputes')
      .select('match_id')
      .eq('id', dispute_id)
      .single();

    if (!dispute) {
      return res.status(404).json({ success: false, error: { message: 'Dispute not found' } });
    }

    await supabaseAdmin
      .from('matches')
      .update({ match_status: 'completed' })
      .eq('id', dispute.match_id);

    const { data, error } = await supabaseAdmin
      .from('disputes')
      .update({
        dispute_status: 'rejected',
        admin_decision: 'upheld',
        admin_notes: admin_notes || null,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', dispute_id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: { message: error.message } });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('[BOT REJECT DISPUTE ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Failed to reject dispute' } });
  }
};

// ============================================
// NEW: PLAYER COMMANDS
// ============================================

/**
 * POST /api/v1/bot/join
 * Player joins the active competition.
 *
 * Body: { phone_number, whatsapp_id, lid, chess_username? }
 */
exports.joinCompetition = async (req, res) => {
  try {
    const { phone_number, whatsapp_id, lid, chess_username } = req.body;

    const user = await lookupUserByIdentifier({ phone_number, whatsapp_id, lid });
    if (!user) {
      return res.status(404).json({ success: false, error: { message: 'User not found. Please register first.' } });
    }

    // Get open_registration competition
    const competition = await getActiveCompetition();
    if (!competition) {
      return res.status(404).json({ success: false, error: { message: 'No active competition with open registration.' } });
    }

    if (competition.competition_status !== 'open_registration') {
      return res.status(400).json({ success: false, error: { message: 'Registration is not open for this competition.' } });
    }

    // Check registration deadline
    if (competition.registration_close_at) {
      if (new Date() > new Date(competition.registration_close_at)) {
        return res.status(400).json({ success: false, error: { message: 'Registration for this competition has closed.' } });
      }
    }

    // Check capacity
    const participantCount = await getParticipantCount(competition.id);
    if (participantCount >= competition.max_participants) {
      return res.status(400).json({ success: false, error: { message: 'Competition is full.' } });
    }

    // Check ELO range
    const elo = user.chess_elo ?? 1000;
    if (elo < (competition.min_elo ?? 800) || elo > (competition.max_elo ?? 3000)) {
      return res.status(400).json({
        success: false,
        error: { message: `Your ELO (${elo}) is outside the competition range (${competition.min_elo}-${competition.max_elo}).` },
      });
    }

    // Check if already registered
    const { data: existing } = await supabaseAdmin
      .from('competition_participants')
      .select('id, participant_status')
      .eq('competition_id', competition.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing && existing.participant_status !== 'withdrawn') {
      return res.status(409).json({ success: false, error: { message: 'You are already registered for this competition.' } });
    }

    // Re-join if previously withdrawn
    if (existing?.participant_status === 'withdrawn') {
      const { data, error } = await supabaseAdmin
        .from('competition_participants')
        .update({
          participant_status: 'registered',
          joined_at: timestamp(),
          eliminated_at: null,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) return res.status(400).json({ success: false, error: { message: error.message } });

      return res.status(201).json({
        success: true,
        data: {
          ...data,
          competition_name: competition.name,
          participant_count: participantCount + 1,
          max_participants: competition.max_participants,
        },
      });
    }

    // New registration
    const { data, error } = await supabaseAdmin
      .from('competition_participants')
      .insert([{
        competition_id: competition.id,
        user_id: user.id,
        participant_status: 'registered',
        score: 0,
        wins: 0,
        draws: 0,
        losses: 0,
      }])
      .select()
      .single();

    if (error) return res.status(400).json({ success: false, error: { message: error.message } });

    res.status(201).json({
      success: true,
      data: {
        ...data,
        competition_name: competition.name,
        participant_count: participantCount + 1,
        max_participants: competition.max_participants,
      },
    });
  } catch (err) {
    console.error('[BOT JOIN ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Failed to join competition' } });
  }
};

/**
 * POST /api/v1/bot/withdraw
 * Player withdraws from the active competition.
 *
 * Body: { phone_number, whatsapp_id, lid, competition_id? }
 */
exports.withdrawFromCompetition = async (req, res) => {
  try {
    const { phone_number, whatsapp_id, lid, competition_id } = req.body;

    const user = await lookupUserByIdentifier({ phone_number, whatsapp_id, lid });
    if (!user) {
      return res.status(404).json({ success: false, error: { message: 'User not found.' } });
    }

    const competition = await getActiveCompetition(competition_id);
    if (!competition) {
      return res.status(404).json({ success: false, error: { message: 'No active competition found.' } });
    }

    if (competition.competition_status === 'active' || competition.competition_status === 'completed') {
      return res.status(400).json({ success: false, error: { message: 'Cannot withdraw after the tournament has started.' } });
    }

    const { data: participant, error: partError } = await supabaseAdmin
      .from('competition_participants')
      .select('*')
      .eq('competition_id', competition.id)
      .eq('user_id', user.id)
      .single();

    if (partError) {
      return res.status(404).json({ success: false, error: { message: 'You are not registered for this competition.' } });
    }

    if (participant.participant_status === 'withdrawn') {
      return res.status(400).json({ success: false, error: { message: 'You have already withdrawn.' } });
    }

    const { error: updateError } = await supabaseAdmin
      .from('competition_participants')
      .update({ participant_status: 'withdrawn' })
      .eq('id', participant.id);

    if (updateError) {
      return res.status(400).json({ success: false, error: { message: updateError.message } });
    }

    res.json({
      success: true,
      data: {
        participant_id: participant.id,
        competition_name: competition.name,
        previous_status: participant.participant_status,
        new_status: 'withdrawn',
        timestamp: timestamp(),
      },
    });
  } catch (err) {
    console.error('[BOT WITHDRAW ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Failed to withdraw' } });
  }
};

/**
 * POST /api/v1/bot/submit-result
 * Player submits a match result with a chess.com game link.
 *
 * Body: { phone_number, whatsapp_id, lid, chess_game_link, match_id? }
 */
exports.submitResult = async (req, res) => {
  try {
    const { phone_number, whatsapp_id, lid, chess_game_link, match_id } = req.body;

    const user = await lookupUserByIdentifier({ phone_number, whatsapp_id, lid });
    if (!user) {
      return res.status(404).json({ success: false, error: { message: 'User not found.' } });
    }

    if (!chess_game_link) {
      return res.status(400).json({ success: false, error: { message: 'chess_game_link is required.' } });
    }

    // Get active competition
    const competition = await getActiveCompetition();
    if (!competition) {
      return res.status(404).json({ success: false, error: { message: 'No active competition found.' } });
    }

    // Find the user's pending match
    let match;
    if (match_id) {
      const { data, error } = await supabaseAdmin
        .from('matches')
        .select('*')
        .eq('id', match_id)
        .single();
      if (error) {
        return res.status(404).json({ success: false, error: { message: 'Match not found.' } });
      }
      match = data;
    } else {
      // Find pending match for this user in the current round
      const { data: matches, error: matchError } = await supabaseAdmin
        .from('matches')
        .select('*')
        .eq('competition_id', competition.id)
        .eq('round_number', competition.current_round)
        .or(`player_a_id.eq.${user.id},player_b_id.eq.${user.id}`)
        .in('match_status', ['pending', 'ongoing']);

      if (matchError || !matches || matches.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'No pending match found for you in the current round.' } });
      }
      match = matches[0];
    }

    // Verify user is a participant
    if (match.player_a_id !== user.id && match.player_b_id !== user.id) {
      return res.status(403).json({ success: false, error: { message: 'You are not a participant in this match.' } });
    }

    if (match.match_status !== 'pending' && match.match_status !== 'ongoing') {
      return res.status(400).json({ success: false, error: { message: `Match status is "${match.match_status}", must be pending or ongoing.` } });
    }

    // Check deadline
    if (match.deadline && new Date() > new Date(match.deadline)) {
      return res.status(400).json({ success: false, error: { message: 'The submission window for this match has closed. Please contact an admin.' } });
    }

    // Get player chess.com usernames
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
      return res.status(400).json({ success: false, error: { message: 'Both players must have chess.com usernames linked.' } });
    }

    // Verify game using chessComService
    const { verifyGameAndDetermineWinner } = require('../services/chessComService');
    let verification;
    try {
      verification = await verifyGameAndDetermineWinner(chess_game_link, playerA, playerB, competition, match);
    } catch (err) {
      console.error('Game verification error:', err);
      return res.status(500).json({ success: false, error: { message: 'An error occurred while verifying the game.' } });
    }

    if (!verification.matched) {
      return res.status(400).json({ success: false, error: { message: `Game verification failed: ${verification.reason}` } });
    }

    // Auto-score the match
    const verifiedResult = verification.result_winner;
    const mySide = match.player_a_id === user.id ? 'a' : 'b';

    const updates = {
      match_status: 'completed',
      result_winner: verifiedResult,
      result_submitted_by: user.id,
      result_submitted_at: timestamp(),
      chess_game_link,
    };

    const { data, error } = await supabaseAdmin
      .from('matches')
      .update(updates)
      .eq('id', match.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: { message: error.message } });
    }

    // Update participant scores
    await updateParticipantScores(match.competition_id, { ...match, result_winner: verifiedResult });

    emitWebhook('match.result_submitted', {
      match_id: match.id,
      competition_id: match.competition_id,
      result_winner: verifiedResult,
      auto_scored: true,
      submitted_by: user.id,
    });

    let resultText = 'Draw';
    if (verifiedResult === 'draw') resultText = 'Draw';
    else if (verifiedResult === mySide) resultText = 'You won';
    else resultText = 'You lost';

    res.json({
      success: true,
      data: {
        ...data,
        auto_scored: true,
        verified_result: verifiedResult,
        result_text: resultText,
      },
    });
  } catch (err) {
    console.error('[BOT SUBMIT RESULT ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Failed to submit result' } });
  }
};

/**
 * POST /api/v1/bot/file-dispute
 * Player files a dispute on a match.
 *
 * Body: { phone_number, whatsapp_id, lid, match_id, reason, description? }
 */
exports.fileDispute = async (req, res) => {
  try {
    const { phone_number, whatsapp_id, lid, match_id, reason, description } = req.body;

    const user = await lookupUserByIdentifier({ phone_number, whatsapp_id, lid });
    if (!user) {
      return res.status(404).json({ success: false, error: { message: 'User not found.' } });
    }

    if (!match_id || !reason) {
      return res.status(400).json({ success: false, error: { message: 'match_id and reason are required' } });
    }

    // Get match to find competition_id
    const { data: match, error: matchError } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('id', match_id)
      .single();

    if (matchError) {
      return res.status(404).json({ success: false, error: { message: 'Match not found' } });
    }

    // Verify user is a participant
    if (match.player_a_id !== user.id && match.player_b_id !== user.id) {
      return res.status(403).json({ success: false, error: { message: 'You can only dispute matches you are part of.' } });
    }

    // Determine opponent
    const opponentId = match.player_a_id === user.id ? match.player_b_id : match.player_a_id;

    // Set match to disputed
    await supabaseAdmin
      .from('matches')
      .update({ match_status: 'disputed' })
      .eq('id', match_id);

    const { data, error } = await supabaseAdmin
      .from('disputes')
      .insert({
        match_id,
        competition_id: match.competition_id,
        raised_by_user_id: user.id,
        opponent_user_id: opponentId,
        filed_by_role: 'player',
        category: 'other',
        reason,
        description: description || null,
        dispute_status: 'open',
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: { message: error.message } });
    }

    emitWebhook('dispute.created', {
      dispute_id: data.id,
      match_id,
      competition_id: match.competition_id,
      raised_by_user_id: user.id,
      reason,
    });

    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('[BOT FILE DISPUTE ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Failed to file dispute' } });
  }
};

/**
 * GET /api/v1/bot/fixtures
 * View all fixtures for a specific round (or current round if not specified).
 * Both players and admins can access this.
 *
 * Query: {
 *   phone_number: "234XXXXXXXXX",  // or whatsapp_id / lid
 *   competition_id?: "uuid",       // Optional, defaults to active competition
 *   round?: 1,                      // Optional, defaults to current round
 *   status?: "pending",             // Optional filter: pending, completed, etc.
 * }
 */
exports.getFixtures = async (req, res) => {
  try {
    const { phone_number, whatsapp_id, lid, competition_id, round, status } = req.query;

    // Look up user (any role can view fixtures)
    const user = await lookupUserByIdentifier({ phone_number, whatsapp_id, lid });
    if (!user) {
      return res.status(404).json({ success: false, error: { message: 'User not found. Please register first.' } });
    }

    // Get competition
    const competition = await getActiveCompetition(competition_id);
    if (!competition) {
      return res.status(404).json({ success: false, error: { message: 'No active competition found.' } });
    }

    // Determine which round to show
    const targetRound = round ? parseInt(round, 10) : competition.current_round;

    if (!targetRound || targetRound < 1) {
      return res.json({
        success: true,
        data: {
          competition: {
            id: competition.id,
            name: competition.name,
            type: competition.tournament_type,
            current_round: competition.current_round,
            total_rounds: competition.rounds,
            status: competition.competition_status,
          },
          round: targetRound || 0,
          fixtures: [],
          message: 'Tournament has not started yet. No fixtures available.',
        },
      });
    }

    // Build query for matches
    let query = supabaseAdmin
      .from('matches')
      .select(`
        id,
        round_number,
        leg,
        match_status,
        result_winner,
        is_bye,
        is_absent,
        absence_side,
        deadline,
        chess_game_link,
        created_at,
        player_a:player_a_id(id, display_name, chess_com_username, chess_username, chess_elo),
        player_b:player_b_id(id, display_name, chess_com_username, chess_username, chess_elo)
      `)
      .eq('competition_id', competition.id)
      .eq('round_number', targetRound)
      .order('id', { ascending: true });

    if (status) {
      query = query.eq('match_status', status);
    }

    const { data: matches, error: matchError } = await query;

    if (matchError) {
      return res.status(400).json({ success: false, error: { message: matchError.message } });
    }

    // Format fixtures for bot display
    const fixtures = (matches || []).map((m) => {
      const isBye = m.is_bye || false;
      let resultText = 'Pending';

      if (m.match_status === 'completed') {
        if (isBye) {
          resultText = 'Bye (auto-win)';
        } else if (m.result_winner === 'draw') {
          resultText = 'Draw';
        } else if (m.result_winner === 'a') {
          resultText = `${m.player_a?.display_name || 'Player A'} won`;
        } else if (m.result_winner === 'b') {
          resultText = `${m.player_b?.display_name || 'Player B'} won`;
        }
      } else if (m.match_status === 'result_submitted') {
        resultText = 'Result submitted';
      } else if (m.match_status === 'disputed') {
        resultText = 'Disputed';
      }

      return {
        match_id: m.id,
        round: m.round_number,
        leg: m.leg || 1,
        player_a: {
          name: m.player_a?.display_name || 'Unknown',
          chess_username: m.player_a?.chess_com_username || m.player_a?.chess_username || null,
          elo: m.player_a?.chess_elo || null,
        },
        player_b: {
          name: m.player_b?.display_name || 'Unknown',
          chess_username: m.player_b?.chess_com_username || m.player_b?.chess_username || null,
          elo: m.player_b?.chess_elo || null,
        },
        status: m.match_status,
        result: resultText,
        result_winner: m.result_winner,
        is_bye: isBye,
        deadline: m.deadline,
        game_link: m.chess_game_link,
      };
    });

    // Get available rounds (rounds that have matches)
    const { data: allMatches } = await supabaseAdmin
      .from('matches')
      .select('round_number')
      .eq('competition_id', competition.id)
      .order('round_number', { ascending: true });

    const availableRounds = [...new Set((allMatches || []).map(m => m.round_number))];

    res.json({
      success: true,
      data: {
        competition: {
          id: competition.id,
          name: competition.name,
          type: competition.tournament_type,
          current_round: competition.current_round,
          total_rounds: competition.rounds,
          status: competition.competition_status,
        },
        round: targetRound,
        available_rounds: availableRounds,
        fixtures_count: fixtures.length,
        fixtures,
      },
    });
  } catch (err) {
    console.error('[BOT FIXTURES ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch fixtures' } });
  }
};

/**
 * GET /api/v1/bot/standings
 * View current standings for the active competition.
 *
 * Query: { competition_id? }
 */
exports.getStandings = async (req, res) => {
  try {
    const { competition_id } = req.query;

    const competition = await getActiveCompetition(competition_id);
    if (!competition) {
      return res.status(404).json({ success: false, error: { message: 'No active competition found.' } });
    }

    const participants = await fetchParticipantsWithUsers(competition.id);

    const { data: matches, error: matchError } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('competition_id', competition.id);

    if (matchError) {
      return res.status(400).json({ success: false, error: { message: matchError.message } });
    }

    const standings = computeStandings(participants, matches || []);

    res.json({
      success: true,
      data: {
        competition: {
          id: competition.id,
          name: competition.name,
          type: competition.tournament_type,
          current_round: competition.current_round,
          total_rounds: competition.rounds,
        },
        standings,
      },
    });
  } catch (err) {
    console.error('[BOT STANDINGS ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch standings' } });
  }
};

// ============================================
// SHARED SCORING HELPERS (copied from matchesController)
// ============================================

async function updateParticipantScores(competitionId, match) {
  const { data: participants } = await supabaseAdmin
    .from('competition_participants')
    .select('*')
    .eq('competition_id', competitionId)
    .in('user_id', [match.player_a_id, match.player_b_id]);

  if (!participants || participants.length === 0) return;

  const partA = participants.find((p) => p.user_id === match.player_a_id);
  const partB = participants.find((p) => p.user_id === match.player_b_id);

  if (match.is_absent) {
    if (match.absence_side === 'both') {
      if (partA) {
        await supabaseAdmin.from('competition_participants')
          .update({ absences: (partA.absences || 0) + 1 }).eq('id', partA.id);
      }
      if (partB) {
        await supabaseAdmin.from('competition_participants')
          .update({ absences: (partB.absences || 0) + 1 }).eq('id', partB.id);
      }
    } else if (match.absence_side === 'a') {
      if (partB) {
        await supabaseAdmin.from('competition_participants')
          .update({ score: Number(partB.score || 0) + 2, wins: (partB.wins || 0) + 1 }).eq('id', partB.id);
      }
      if (partA) {
        await supabaseAdmin.from('competition_participants')
          .update({ absences: (partA.absences || 0) + 1 }).eq('id', partA.id);
      }
    } else if (match.absence_side === 'b') {
      if (partA) {
        await supabaseAdmin.from('competition_participants')
          .update({ score: Number(partA.score || 0) + 2, wins: (partA.wins || 0) + 1 }).eq('id', partA.id);
      }
      if (partB) {
        await supabaseAdmin.from('competition_participants')
          .update({ absences: (partB.absences || 0) + 1 }).eq('id', partB.id);
      }
    }
    return;
  }

  if (!match.result_winner) return;

  if (match.result_winner === 'a') {
    if (partA) {
      await supabaseAdmin.from('competition_participants')
        .update({ score: Number(partA.score || 0) + 2, wins: (partA.wins || 0) + 1 }).eq('id', partA.id);
    }
    if (partB) {
      await supabaseAdmin.from('competition_participants')
        .update({ losses: (partB.losses || 0) + 1 }).eq('id', partB.id);
    }
  } else if (match.result_winner === 'b') {
    if (partB) {
      await supabaseAdmin.from('competition_participants')
        .update({ score: Number(partB.score || 0) + 2, wins: (partB.wins || 0) + 1 }).eq('id', partB.id);
    }
    if (partA) {
      await supabaseAdmin.from('competition_participants')
        .update({ losses: (partA.losses || 0) + 1 }).eq('id', partA.id);
    }
  } else if (match.result_winner === 'draw') {
    if (partA) {
      await supabaseAdmin.from('competition_participants')
        .update({ score: Number(partA.score || 0) + 1, draws: (partA.draws || 0) + 1 }).eq('id', partA.id);
    }
    if (partB) {
      await supabaseAdmin.from('competition_participants')
        .update({ score: Number(partB.score || 0) + 1, draws: (partB.draws || 0) + 1 }).eq('id', partB.id);
    }
  }
}

async function reverseParticipantScores(competitionId, match) {
  const { data: participants } = await supabaseAdmin
    .from('competition_participants')
    .select('*')
    .eq('competition_id', competitionId)
    .in('user_id', [match.player_a_id, match.player_b_id]);

  if (!participants || participants.length === 0) return;

  const partA = participants.find((p) => p.user_id === match.player_a_id);
  const partB = participants.find((p) => p.user_id === match.player_b_id);

  if (match.is_absent) {
    if (match.absence_side === 'both') {
      if (partA) {
        await supabaseAdmin.from('competition_participants')
          .update({ absences: Math.max(0, (partA.absences || 0) - 1) }).eq('id', partA.id);
      }
      if (partB) {
        await supabaseAdmin.from('competition_participants')
          .update({ absences: Math.max(0, (partB.absences || 0) - 1) }).eq('id', partB.id);
      }
    } else if (match.absence_side === 'a') {
      if (partB) {
        await supabaseAdmin.from('competition_participants')
          .update({ score: Math.max(0, Number(partB.score || 0) - 2), wins: Math.max(0, (partB.wins || 0) - 1) }).eq('id', partB.id);
      }
      if (partA) {
        await supabaseAdmin.from('competition_participants')
          .update({ absences: Math.max(0, (partA.absences || 0) - 1) }).eq('id', partA.id);
      }
    } else if (match.absence_side === 'b') {
      if (partA) {
        await supabaseAdmin.from('competition_participants')
          .update({ score: Math.max(0, Number(partA.score || 0) - 2), wins: Math.max(0, (partA.wins || 0) - 1) }).eq('id', partA.id);
      }
      if (partB) {
        await supabaseAdmin.from('competition_participants')
          .update({ absences: Math.max(0, (partB.absences || 0) - 1) }).eq('id', partB.id);
      }
    }
    return;
  }

  if (!match.result_winner) return;

  if (match.result_winner === 'a') {
    if (partA) {
      await supabaseAdmin.from('competition_participants')
        .update({ score: Math.max(0, Number(partA.score || 0) - 2), wins: Math.max(0, (partA.wins || 0) - 1) }).eq('id', partA.id);
    }
    if (partB) {
      await supabaseAdmin.from('competition_participants')
        .update({ losses: Math.max(0, (partB.losses || 0) - 1) }).eq('id', partB.id);
    }
  } else if (match.result_winner === 'b') {
    if (partB) {
      await supabaseAdmin.from('competition_participants')
        .update({ score: Math.max(0, Number(partB.score || 0) - 2), wins: Math.max(0, (partB.wins || 0) - 1) }).eq('id', partB.id);
    }
    if (partA) {
      await supabaseAdmin.from('competition_participants')
        .update({ losses: Math.max(0, (partA.losses || 0) - 1) }).eq('id', partA.id);
    }
  } else if (match.result_winner === 'draw') {
    if (partA) {
      await supabaseAdmin.from('competition_participants')
        .update({ score: Math.max(0, Number(partA.score || 0) - 1), draws: Math.max(0, (partA.draws || 0) - 1) }).eq('id', partA.id);
    }
    if (partB) {
      await supabaseAdmin.from('competition_participants')
        .update({ score: Math.max(0, Number(partB.score || 0) - 1), draws: Math.max(0, (partB.draws || 0) - 1) }).eq('id', partB.id);
    }
  }
}