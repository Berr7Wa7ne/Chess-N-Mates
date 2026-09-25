/**
 * Pull Chess.com ratings into users.chess_elo so odds/Win% use real ratings
 * even when the Express process has not been redeployed with hydrateOddsEntities.
 *
 * Usage:
 *   node backend/scripts/sync-chesscom-ratings.js
 *   node backend/scripts/sync-chesscom-ratings.js <competitionId>
 *   node backend/scripts/sync-chesscom-ratings.js --all
 */
require('../config/env');
const { supabaseAdmin } = require('../config/supabase');
const {
  resolveChessComUsername,
  fetchPlayerRatings,
  ratingForTimeControl,
} = require('../services/chessComService');

async function usersToSync(competitionId, allUsers) {
  if (allUsers) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, display_name, chess_com_username, chess_username, chess_platform, chess_elo');
    if (error) throw new Error(error.message);
    return data || [];
  }

  if (competitionId) {
    const { data, error } = await supabaseAdmin
      .from('competition_participants')
      .select(
        'user_id, users:user_id(id, display_name, chess_com_username, chess_username, chess_platform, chess_elo)'
      )
      .eq('competition_id', competitionId)
      .in('participant_status', ['active', 'registered']);
    if (error) throw new Error(error.message);
    return (data || []).map((p) => p.users).filter(Boolean);
  }

  // Default: all active Swiss/open competitions' participants
  const { data: comps } = await supabaseAdmin
    .from('competitions')
    .select('id, name, time_control, competition_status')
    .in('competition_status', ['active', 'open_registration']);

  const byId = new Map();
  for (const c of comps || []) {
    const { data: parts } = await supabaseAdmin
      .from('competition_participants')
      .select(
        'users:user_id(id, display_name, chess_com_username, chess_username, chess_platform, chess_elo)'
      )
      .eq('competition_id', c.id)
      .in('participant_status', ['active', 'registered']);
    for (const p of parts || []) {
      if (p.users?.id) byId.set(p.users.id, p.users);
    }
  }
  return [...byId.values()];
}

async function main() {
  const arg = process.argv[2];
  const allUsers = arg === '--all';
  const competitionId = allUsers || !arg ? null : arg;

  // Prefer time control from first active competition (for class pick)
  let timeControl = '10+0';
  if (competitionId) {
    const { data: c } = await supabaseAdmin
      .from('competitions')
      .select('time_control')
      .eq('id', competitionId)
      .maybeSingle();
    if (c?.time_control) timeControl = c.time_control;
  } else {
    const { data: c } = await supabaseAdmin
      .from('competitions')
      .select('time_control')
      .eq('competition_status', 'active')
      .limit(1)
      .maybeSingle();
    if (c?.time_control) timeControl = c.time_control;
  }

  const users = await usersToSync(competitionId, allUsers);
  console.log(`Syncing ${users.length} users (time_control=${timeControl})...\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    const username = resolveChessComUsername(user);
    if (!username) {
      console.log(`  skip ${user.display_name || user.id}: no Chess.com username`);
      skipped += 1;
      continue;
    }

    const ratings = await fetchPlayerRatings(username);
    const rating = ratingForTimeControl(ratings, timeControl);
    if (!rating) {
      console.log(`  fail ${user.display_name} (@${username}): no rating on Chess.com`);
      failed += 1;
      continue;
    }

    const prev = Number(user.chess_elo) || 0;
    if (prev === rating) {
      console.log(`  ok   ${user.display_name}: already ${rating}`);
      skipped += 1;
      continue;
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update({ chess_elo: rating })
      .eq('id', user.id);

    if (error) {
      console.log(`  fail ${user.display_name}: ${error.message}`);
      failed += 1;
      continue;
    }

    console.log(`  set  ${user.display_name}: ${prev} → ${rating} (@${username})`);
    updated += 1;

    // Be gentle with Chess.com public API
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`\nDone. updated=${updated} skipped=${skipped} failed=${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
