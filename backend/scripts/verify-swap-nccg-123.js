/**
 * Verify the September 2026 participant substitution (nccg_123 -> oreoluwa12)
 * described in backend/migrations/replace_nccg_123_september_2026.sql.
 *
 * Read-only: this script never writes. It reports whether the swap is
 * APPLIED / NOT APPLIED / INCONSISTENT and checks the invariant that keeps the
 * standings correct: every matches.player_a_id / player_b_id must have a
 * matching competition_participants.user_id
 * (see services/standingsService.js -> applyMatches()).
 *
 * Usage: node backend/scripts/verify-swap-nccg-123.js
 *
 * Exit codes: 0 = applied and verified | 2 = not applied yet | 1 = problems
 */

require('../config/env');
const { supabaseAdmin } = require('../config/supabase');

// ---------------------------------------------------------------- identifiers
const COMPETITION_ID = 'b70b608d-3d15-412e-b3c2-3edaf917324f'; // September 2026
const SLOT_ROW_ID = '1cedbdfa-48dc-4a62-83f9-53a56b91072f'; // competition_participants.id
const OLD_USER_ID = 'b1475774-dbbe-4eb4-b62e-2d66c3817a6d'; // nccg_123 (out)
const NEW_USER_ID = '2faae38e-2e97-4e09-a7f7-c56628038f1d'; // mattystreamer -> oreoluwa12 (in)
const NEW_CHESS_USERNAME = 'oreoluwa12';

// The slot's inherited record at the moment of the swap: score 2.00 · W1 · D0 · L2.
// Only the losses are asserted later — wins/score grow as the substitute plays on.
const EXPECTED_STATS = { score: 2, wins: 1, draws: 0, losses: 2, absences: 0, byes: 0 };

// The inherited fixtures. R1-R3 are frozen history (result must stay and remain
// attributed to the slot); R4 onwards belongs to the substitute, so only its side
// is asserted — status/result are whatever the tournament has produced since.
const EXPECTED_FIXTURES = [
  { match_id: 'e5ee6241-b540-48c8-942e-b01182e6102e', round: 1, side: 'a', status: 'completed', winner: 'a', opponent: 'IWEBS_M' },
  { match_id: 'fbb05808-1702-4fdb-9a2d-8f05f9d091a4', round: 2, side: 'a', status: 'completed', winner: 'b', opponent: 'goatstein' },
  { match_id: 'e0397d1f-f190-4cdd-a197-6bf250918a20', round: 3, side: 'b', status: 'completed', winner: 'a', opponent: 'aida001' },
  { match_id: 'a27c7a16-898d-4b5a-a91b-30d5882c7782', round: 4, side: 'b', status: null, winner: undefined, opponent: 'Bobnestar' },
];

const EXPECTED_PARTICIPANTS = 22;

// --------------------------------------------------------------------- helpers
const ok = (msg) => console.log(`  [OK]   ${msg}`);
const fail = (msg) => console.log(`  [FAIL] ${msg}`);
const info = (msg) => console.log(`  [i]    ${msg}`);

function two(n) {
  const v = Number(n || 0);
  return v.toFixed(2);
}

function fmt(ts) {
  return ts ? new Date(ts).toISOString() : '-';
}

function userLabel(user) {
  if (!user) return '(unknown user)';
  return (
    user.display_name ||
    user.chess_com_username ||
    user.chess_username ||
    (user.id ? `Player ${user.id}` : '(unknown)')
  );
}

async function loadState() {
  const { data: competition, error: compErr } = await supabaseAdmin
    .from('competitions')
    .select('id, name, competition_status, tournament_type, current_round, rounds, time_control')
    .eq('id', COMPETITION_ID)
    .single();

  if (compErr || !competition) {
    throw new Error(`Competition ${COMPETITION_ID} not found: ${compErr?.message || 'no row'}`);
  }

  const { data: participants, error: partErr } = await supabaseAdmin
    .from('competition_participants')
    .select(
      'id, user_id, participant_status, score, wins, draws, losses, absences, byes, joined_at, users(id, display_name, chess_com_username, chess_username, chess_elo, user_status, whatsapp_id)'
    )
    .eq('competition_id', COMPETITION_ID);

  if (partErr) throw new Error(`Participants query failed: ${partErr.message}`);

  const { data: matches, error: matchErr } = await supabaseAdmin
    .from('matches')
    .select('id, round_number, player_a_id, player_b_id, match_status, result_winner, result_source, deadline, is_bye')
    .eq('competition_id', COMPETITION_ID);

  if (matchErr) throw new Error(`Matches query failed: ${matchErr.message}`);

  const { data: users, error: userErr } = await supabaseAdmin
    .from('users')
    .select('id, display_name, chess_com_username, chess_username, chess_elo, user_status, whatsapp_id, phone_number')
    .in('id', [OLD_USER_ID, NEW_USER_ID]);

  if (userErr) throw new Error(`Users query failed: ${userErr.message}`);

  const { data: audit } = await supabaseAdmin
    .from('admin_logs')
    .select('id, admin_id, action, entity_type, entity_id, created_at')
    .eq('action', 'participant_replaced')
    .eq('entity_id', COMPETITION_ID)
    .order('created_at', { ascending: false })
    .limit(1);

  return {
    competition,
    participants: participants || [],
    matches: matches || [],
    users: users || [],
    audit: (audit || [])[0] || null,
  };
}

// ------------------------------------------------------------------- reports
function reportNotApplied(state, slotRow, matchesOld) {
  console.log('\nSTATE: NOT APPLIED - the slot still belongs to nccg_123.');
  if (!slotRow) {
    fail(`slot row ${SLOT_ROW_ID} does not exist in competition_participants`);
  } else {
    info(`slot row ${SLOT_ROW_ID} -> ${userLabel(slotRow.users)} (${slotRow.user_id})`);
    info(
      `record: score ${two(slotRow.score)} | W${slotRow.wins} D${slotRow.draws} L${slotRow.losses} | absences ${slotRow.absences} | byes ${slotRow.byes}`
    );
  }
  info(`${matchesOld.length} fixture(s) still reference nccg_123 (expected 4 before the swap).`);
  console.log('\nTo apply the substitution: open the Supabase SQL editor, paste');
  console.log('  backend/migrations/replace_nccg_123_september_2026.sql');
  console.log('and Run, then re-run this script. (Or: node backend/scripts/run-migrations.js');
  console.log('replace_nccg_123_september_2026.sql once SUPABASE_DB_PASSWORD is in .env.)');
  process.exitCode = 2;
}

function reportInconsistent(state, problems, matchesOld, matchesNew) {
  console.log('\nSTATE: INCONSISTENT - the substitution is half-applied. Do not leave it here.');
  console.log('A match pointing at a user with no participant row is silently dropped from');
  console.log('the standings (services/standingsService.js -> applyMatches), which erases');
  console.log('round 1-3 results and corrupts Buchholz / Sonneborn-Berger for the field.\n');
  info(`${problems.length} problem(s) listed above (see "--- checks ---").`);
  info(`fixtures still on nccg_123: ${matchesOld.length} | fixtures on the incoming user: ${matchesNew.length}`);
  console.log('\nFinish the swap by re-running');
  console.log('  backend/migrations/replace_nccg_123_september_2026.sql');
  console.log('or go back with the UNDO block at the bottom of that file.');
  process.exitCode = 1;
}

// ----------------------------------------------------------------------- main
async function main() {
  const state = await loadState();

  const nameById = new Map();
  for (const p of state.participants) nameById.set(p.user_id, userLabel(p.users || {}));
  for (const u of state.users) nameById.set(u.id, userLabel(u));

  const slotRow = state.participants.find((p) => p.id === SLOT_ROW_ID);
  const slotByOld = state.participants.find((p) => p.user_id === OLD_USER_ID);
  const slotByNew = state.participants.find((p) => p.user_id === NEW_USER_ID);
  const matchesOld = state.matches.filter(
    (m) => m.player_a_id === OLD_USER_ID || m.player_b_id === OLD_USER_ID
  );
  const matchesNew = state.matches.filter(
    (m) => m.player_a_id === NEW_USER_ID || m.player_b_id === NEW_USER_ID
  );
  const oldUser = state.users.find((u) => u.id === OLD_USER_ID);
  const newUser = state.users.find((u) => u.id === NEW_USER_ID);

  console.log(`\n=== Participant swap check - ${state.competition.name} ===`);
  console.log(
    `competition ${state.competition.id} | ${state.competition.competition_status} | round ${state.competition.current_round}/${state.competition.rounds} | TC ${state.competition.time_control || '-'}`
  );
  info(`slot (out) : nccg_123 = ${OLD_USER_ID}`);
  info(`slot (in)  : ${NEW_USER_ID} = ${userLabel(newUser)}`);
  info(`participants: ${state.participants.length} | fixtures: ${state.matches.length}`);

  // state: nothing moved yet / fully moved / half-moved
  const movedSomething = matchesNew.length > 0 || Boolean(slotByNew);
  const stillOnOldUser = matchesOld.length > 0 || Boolean(slotByOld);

  if (!movedSomething && stillOnOldUser) {
    reportNotApplied(state, slotRow, matchesOld);
    return;
  }

  console.log('\n--- checks ---');
  const problems = [];

  const check = (condition, okMsg, failMsg) => {
    if (condition) {
      ok(okMsg);
    } else {
      fail(failMsg);
      problems.push(failMsg);
    }
  };

  // 1. ownership
  check(
    Boolean(slotByNew) && slotByNew.id === SLOT_ROW_ID,
    `slot row ${SLOT_ROW_ID} belongs to the incoming user (${userLabel(newUser)})`,
    `slot row ${SLOT_ROW_ID} does not belong to ${NEW_USER_ID} (row ${slotRow ? slotRow.user_id : 'missing'})`
  );

  // 2. the inherited record survived the hand-over.
  //    Losses are the time-invariant part (R2 + R3); wins/score legitimately grow
  //    as the substitute plays on, so they are reported rather than asserted.
  if (slotByNew) {
    const losses = Number(slotByNew.losses || 0);
    check(
      losses >= EXPECTED_STATS.losses,
      `inherited losses preserved - slot record now score ${two(slotByNew.score)} | W${slotByNew.wins} D${slotByNew.draws} L${slotByNew.losses} | absences ${slotByNew.absences} | byes ${slotByNew.byes}`,
      `slot lost the inherited losses: expected >= ${EXPECTED_STATS.losses}, got ${losses}`
    );
  }

  // 3. no leftovers on the old user
  check(
    !slotByOld,
    'no participant row left on nccg_123',
    `nccg_123 still owns participant row ${slotByOld ? slotByOld.id : ''} in this competition`
  );
  check(
    matchesOld.length === 0,
    'no fixtures reference nccg_123',
    `${matchesOld.length} fixture(s) still reference nccg_123: ${matchesOld
      .map((m) => `R${m.round_number}`)
      .join(', ')}`
  );

  // 4. the four fixtures, with the R3 forfeit preserved as a loss
  for (const expected of EXPECTED_FIXTURES) {
    const m = state.matches.find((x) => x.id === expected.match_id);
    if (!m) {
      fail(`R${expected.round} fixture ${expected.match_id} not found`);
      problems.push(`R${expected.round} fixture missing`);
      continue;
    }

    const side = m.player_a_id === NEW_USER_ID ? 'a' : m.player_b_id === NEW_USER_ID ? 'b' : null;
    const opponentId = side === 'a' ? m.player_b_id : m.player_a_id;
    const wrong = [];
    if (side !== expected.side) wrong.push(`side=${side || 'none'} (expected ${expected.side})`);
    if (expected.status && m.match_status !== expected.status) {
      wrong.push(`status=${m.match_status} (expected ${expected.status})`);
    }
    if (expected.winner !== undefined && (m.result_winner || null) !== expected.winner) {
      wrong.push(`winner=${m.result_winner || 'none'} (expected ${expected.winner || 'none'})`);
    }

    const label = `R${expected.round} vs ${nameById.get(opponentId) || expected.opponent}`;
    if (wrong.length === 0) {
      ok(
        `${label} - ${m.match_status}${m.result_winner ? ` (${m.result_winner})` : ''}, source ${m.result_source || '-'}`
      );
    } else {
      fail(`${label} - ${wrong.join('; ')}`);
      problems.push(`R${expected.round} fixture wrong`);
    }
  }

  // 5. integrity net - the invariant that protects the standings
  const participantIds = new Set(state.participants.map((p) => p.user_id));
  const orphans = state.matches.filter(
    (m) => !participantIds.has(m.player_a_id) || !participantIds.has(m.player_b_id)
  );
  check(
    orphans.length === 0,
    'integrity: every fixture player has a participant row',
    `integrity broken - ${orphans.length} fixture(s) point at a non-participant: ${orphans
      .map((m) => `R${m.round_number}/${m.id}`)
      .join(', ')}`
  );

  // 6. the two accounts
  check(
    oldUser?.user_status === 'banned',
    'nccg_123 account retired (user_status = banned)',
    oldUser?.user_status === 'inactive'
      ? 'nccg_123 account is inactive (expected banned - harmless if intentional)'
      : `nccg_123 account user_status = ${oldUser?.user_status || 'missing'} (expected banned)`
  );
  check(
    newUser?.chess_com_username === NEW_CHESS_USERNAME,
    `incoming account registered as ${NEW_CHESS_USERNAME}`,
    `incoming account chess_com_username = ${newUser?.chess_com_username || 'missing'} (expected ${NEW_CHESS_USERNAME})`
  );
  check(
    Boolean(newUser?.whatsapp_id),
    `incoming account is bot-reachable (whatsapp_id ${newUser?.whatsapp_id})`,
    'incoming account has no whatsapp_id - the bot cannot resolve their WhatsApp commands'
  );

  // 7. audit trail + unchanged field size
  check(
    Boolean(state.audit),
    `audit row present (admin_logs ${state.audit?.id}, ${fmt(state.audit?.created_at)})`,
    'no admin_logs row with action = participant_replaced for this competition'
  );
  const activeCount = state.participants.filter((p) => p.participant_status !== 'withdrawn').length;
  check(
    activeCount === EXPECTED_PARTICIPANTS,
    `active participant count unchanged (${EXPECTED_PARTICIPANTS})`,
    `active participant count is ${activeCount} (expected ${EXPECTED_PARTICIPANTS})`
  );

  // 8. fixtures that still have to be played under the new owner
  const pending = matchesNew.filter((m) => ['pending', 'ongoing'].includes(m.match_status));
  for (const m of pending) {
    const isA = m.player_a_id === NEW_USER_ID;
    const opponentId = isA ? m.player_b_id : m.player_a_id;
    info(
      `action needed: R${m.round_number} vs ${nameById.get(opponentId) || 'unknown'} - plays as ${isA ? 'white (player_a)' : 'black (player_b)'}, status ${m.match_status}, deadline ${fmt(m.deadline)}`
    );
  }

  console.log('\n--- verdict ---');
  if (problems.length === 0) {
    ok(
      `APPLIED and verified - ${userLabel(newUser)} holds the slot with score ${two(slotByNew?.score)} (W${slotByNew?.wins} D${slotByNew?.draws} L${slotByNew?.losses}).`
    );
    console.log('\nNext steps:');
    console.log(`  1) node backend/scripts/sync-chesscom-ratings.js ${COMPETITION_ID}`);
    console.log('  2) announce the substitution in the group (published rules need the addendum)');
    if (pending.length > 0) {
      console.log('  3) tell the replacement to play the pending fixture before its deadline');
    }
    process.exitCode = 0;
  } else {
    reportInconsistent(state, problems, matchesOld, matchesNew);
  }
}

main().catch((err) => {
  console.error('\nCheck failed:', err.message || err);
  process.exit(1);
});




