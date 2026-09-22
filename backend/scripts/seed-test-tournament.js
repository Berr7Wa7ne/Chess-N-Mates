/**
 * Seed a same-day Swiss test tournament with Chess.com players, then start it.
 * Usage: node backend/scripts/seed-test-tournament.js
 */
require('../config/env');
const { supabaseAdmin } = require('../config/supabase');

const CREATED_BY = '1b808aac-6525-4720-8e1a-05a524212f3c'; // afangMonster admin

const PLAYER_PHONES = [
  '2347013604664', // Grandmonsieur
  '2348109299162', // J13IN
  '2347030843225', // FianchettoGM
  '2347044156814', // Astro_of_ph
  '2348134086393', // infamosnuel
  '2348093208733', // Sheuntop
  '2349036006275', // efosartstudios
  '2348051763431', // geniusofmankind
];

async function main() {
  const now = Date.now();
  const registration_open_at = new Date(now - 60 * 60 * 1000).toISOString();
  const registration_close_at = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
  const start_date = new Date(now).toISOString();
  const end_date = new Date(now + 24 * 60 * 60 * 1000).toISOString();

  const { data: competition, error: createError } = await supabaseAdmin
    .from('competitions')
    .insert([
      {
        name: 'Auto-Compute Test Swiss (Sep 2026)',
        description: 'Same-day Swiss for testing Chess.com Compute Chess.com button',
        tournament_type: 'swiss',
        max_participants: 16,
        rounds: 3,
        min_elo: 800,
        max_elo: 3000,
        created_by: CREATED_BY,
        registration_open_at,
        registration_close_at,
        start_date,
        end_date,
        time_control: '5+0',
        timezone: 'UTC+1:00',
        entry_fee: 'Free',
        prize: 'Bragging rights',
        platform: 'chess.com',
        match_length: 'single_game',
        format_match_rules: 'single_game_per_round',
        rules: ['Test event — play 5+0 on Chess.com', 'Admin will run Compute Chess.com'],
        round_robin_legs: 1,
        auto_compute_enabled: true,
        match_deadline_hours: 2,
        competition_status: 'open_registration',
        current_round: 0,
        is_featured: false,
      },
    ])
    .select()
    .single();

  if (createError) throw new Error(`Create failed: ${createError.message}`);

  const { data: users, error: usersError } = await supabaseAdmin
    .from('users')
    .select('id, display_name, phone_number, chess_com_username')
    .in('phone_number', PLAYER_PHONES);

  if (usersError) throw new Error(usersError.message);

  const participantRows = (users || []).map((u) => ({
    competition_id: competition.id,
    user_id: u.id,
    participant_status: 'registered',
    score: 0,
    wins: 0,
    draws: 0,
    losses: 0,
  }));

  if (participantRows.length < 2) {
    throw new Error(`Only found ${participantRows.length} players — need at least 2`);
  }

  const { error: joinError } = await supabaseAdmin
    .from('competition_participants')
    .insert(participantRows);

  if (joinError) throw new Error(`Join failed: ${joinError.message}`);

  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const startRes = await fetch(`${base}/api/v1/competitions/${competition.id}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const startBody = await startRes.json();
  if (!startRes.ok || !startBody.success) {
    throw new Error(`Start failed: ${startBody?.error?.message || startRes.status}`);
  }

  const { data: matches } = await supabaseAdmin
    .from('matches')
    .select(
      'id, round_number, match_status, is_bye, player_a_id, player_b_id, deadline, player_a:player_a_id(display_name,chess_com_username), player_b:player_b_id(display_name,chess_com_username)'
    )
    .eq('competition_id', competition.id)
    .eq('round_number', 1)
    .order('id');

  console.log(JSON.stringify({
    competition_id: competition.id,
    name: competition.name,
    status: 'active',
    rounds: 3,
    match_deadline_hours: 2,
    time_control: '5+0',
    players: (users || []).map((u) => ({
      name: u.display_name,
      chess_com: u.chess_com_username,
    })),
    round_1_pairings: (matches || []).map((m) => ({
      bye: m.is_bye,
      a: m.player_a?.display_name || null,
      b: m.is_bye ? 'BYE' : m.player_b?.display_name || null,
      a_chess: m.player_a?.chess_com_username,
      b_chess: m.player_b?.chess_com_username,
      deadline: m.deadline,
      status: m.match_status,
    })),
    admin_urls: {
      overview: `http://localhost:3000/admin/competitions/${competition.id}`,
      matches: `http://localhost:3000/admin/competitions/${competition.id}/matches`,
    },
  }, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
