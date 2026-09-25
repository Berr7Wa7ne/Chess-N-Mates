/**
 * Thorough Swiss pairing verification (no external test runner).
 * Run: node backend/scripts/test-swiss-pairing.js
 */
const { generateSwissPairings, chooseByePlayer } = require('../services/tournament/swiss');
const { hasPlayedBefore, getColorBalance, withLiveScores } = require('../services/tournament/scoring');
const { generateFixtures } = require('../services/fixtureGenerator');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function makePlayers(n, opts = {}) {
  return Array.from({ length: n }, (_, i) => ({
    user_id: `p${i + 1}`,
    score: opts.scores?.[i] ?? 0,
    chess_elo: opts.elos?.[i] ?? 2000 - i * 10,
    participant_status: 'active',
    users: { display_name: `Player ${i + 1}`, chess_elo: opts.elos?.[i] ?? 2000 - i * 10 },
  }));
}

function gameKey(a, b) {
  return [a, b].sort().join('|');
}

function assertValidRound(pairs, playerCount, label) {
  const byes = pairs.filter((p) => p.is_bye);
  const games = pairs.filter((p) => !p.is_bye);
  const expectedByes = playerCount % 2;
  const expectedGames = Math.floor(playerCount / 2);

  assert(byes.length === expectedByes, `${label}: expect ${expectedByes} bye(s), got ${byes.length}`);
  assert(games.length === expectedGames, `${label}: expect ${expectedGames} games, got ${games.length}`);

  const used = new Set();
  for (const p of pairs) {
    assert(p.player_a_id, `${label}: missing player_a`);
    if (p.is_bye) {
      assert(p.player_a_id === p.player_b_id, `${label}: bye must have a===b`);
      assert(!used.has(p.player_a_id), `${label}: player paired twice (bye)`);
      used.add(p.player_a_id);
    } else {
      assert(p.player_a_id !== p.player_b_id, `${label}: real game cannot be self`);
      assert(!used.has(p.player_a_id), `${label}: ${p.player_a_id} paired twice`);
      assert(!used.has(p.player_b_id), `${label}: ${p.player_b_id} paired twice`);
      used.add(p.player_a_id);
      used.add(p.player_b_id);
    }
  }
  assert(used.size === playerCount, `${label}: cover all players (${used.size}/${playerCount})`);
}

function simulateRound(players, history, resultsByKey) {
  const pairs = generateSwissPairings(players, history);
  assertValidRound(pairs, players.length, 'sim round');

  const newMatches = [];
  for (const p of pairs) {
    if (p.is_bye) {
      newMatches.push({
        player_a_id: p.player_a_id,
        player_b_id: p.player_b_id,
        is_bye: true,
        match_status: 'completed',
        result_winner: 'a',
      });
      continue;
    }
    const key = gameKey(p.player_a_id, p.player_b_id);
    const outcome = (resultsByKey && resultsByKey[key]) || 'a';
    newMatches.push({
      player_a_id: p.player_a_id,
      player_b_id: p.player_b_id,
      is_bye: false,
      match_status: 'completed',
      result_winner: outcome,
    });
  }
  return { pairs, history: [...history, ...newMatches] };
}

let passed = 0;
function ok(name) {
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log('Swiss pairing checks\n');

// 1. Round 1 even field — classic top vs bottom
{
  const players = makePlayers(8);
  const pairs = generateSwissPairings(players, []);
  assertValidRound(pairs, 8, 'R1 even');
  const games = pairs.filter((p) => !p.is_bye);
  // Highest Elo p1 should meet mid-field (classic half)
  const p1game = games.find((g) => g.player_a_id === 'p1' || g.player_b_id === 'p1');
  assert(p1game, 'R1: p1 paired');
  const opp = p1game.player_a_id === 'p1' ? p1game.player_b_id : p1game.player_a_id;
  assert(opp === 'p5', `R1 classic: p1 vs p5, got vs ${opp}`);
  ok('Round 1 even field uses classic top-half vs bottom-half');
}

// 2. Odd field bye to lowest Elo / fewest byes
{
  const players = makePlayers(5);
  const pairs = generateSwissPairings(players, []);
  assertValidRound(pairs, 5, 'R1 odd');
  const bye = pairs.find((p) => p.is_bye);
  assert(bye.player_a_id === 'p5', `Odd bye should go to lowest Elo p5, got ${bye.player_a_id}`);
  ok('Odd field: bye to lowest Elo with fewest prior byes');
}

// 3. Rematch avoidance after round 1
{
  const players = makePlayers(4);
  let history = [];
  const r1 = simulateRound(players, history, {
    [gameKey('p1', 'p3')]: 'a',
    [gameKey('p2', 'p4')]: 'a',
  });
  // Force known R1 if classic pairs differently — rebuild with explicit history
  history = [
    { player_a_id: 'p1', player_b_id: 'p2', is_bye: false, match_status: 'completed', result_winner: 'a' },
    { player_a_id: 'p3', player_b_id: 'p4', is_bye: false, match_status: 'completed', result_winner: 'a' },
  ];
  const scored = withLiveScores(players, history);
  const r2 = generateSwissPairings(scored, history);
  assertValidRound(r2, 4, 'R2 rematch');
  const rematch = r2.some(
    (g) =>
      !g.is_bye &&
      (hasPlayedBefore(history, g.player_a_id, g.player_b_id))
  );
  assert(!rematch, 'R2 should not rematch R1 opponents');
  const leadersMeet = r2.some(
    (g) =>
      !g.is_bye &&
      ((g.player_a_id === 'p1' && g.player_b_id === 'p3') ||
        (g.player_a_id === 'p3' && g.player_b_id === 'p1'))
  );
  assert(leadersMeet, 'R2: score leaders p1 & p3 should meet');
  ok('Rematch avoidance + same-score pairing (winners play)');
}

// 4. Bye rotation — player with a bye should not get the next one if others eligible
{
  const players = makePlayers(5);
  const history = [
    {
      player_a_id: 'p5',
      player_b_id: 'p5',
      is_bye: true,
      match_status: 'completed',
      result_winner: 'a',
    },
    // Give others 2 pts so p5 is still lowest-ish but already has a bye
    { player_a_id: 'p1', player_b_id: 'p2', is_bye: false, match_status: 'completed', result_winner: 'a' },
    { player_a_id: 'p3', player_b_id: 'p4', is_bye: false, match_status: 'completed', result_winner: 'draw' },
  ];
  const scored = withLiveScores(players, history);
  const byePlayer = chooseByePlayer(scored, history);
  assert(byePlayer.user_id !== 'p5', `Bye rotation: p5 already had bye, chose ${byePlayer.user_id}`);
  const pairs = generateSwissPairings(scored, history);
  assertValidRound(pairs, 5, 'bye rotate');
  const bye = pairs.find((p) => p.is_bye);
  assert(bye.player_a_id !== 'p5', 'Bye rotation: second bye not to p5');
  ok('Bye rotates away from players who already received one');
}

// 5. Color balance — player who had White gets Black next when possible
{
  const players = makePlayers(4);
  const history = [
    { player_a_id: 'p1', player_b_id: 'p2', is_bye: false, match_status: 'completed', result_winner: 'a' },
    { player_a_id: 'p3', player_b_id: 'p4', is_bye: false, match_status: 'completed', result_winner: 'a' },
  ];
  const scored = withLiveScores(players, history);
  const pairs = generateSwissPairings(scored, history);
  const leaders = pairs.find(
    (g) =>
      !g.is_bye &&
      ((g.player_a_id === 'p1' && g.player_b_id === 'p3') ||
        (g.player_a_id === 'p3' && g.player_b_id === 'p1'))
  );
  assert(leaders, 'color: leaders paired');
  // Both had White in R1 → balances tied; either color OK. Check balances still tracked.
  assert(getColorBalance('p1', history) === 1, 'p1 had white');
  assert(getColorBalance('p2', history) === -1, 'p2 had black');
  ok('Color balance helpers track white/black correctly');
}

// 6. Multi-round simulation — no rematches across 3 rounds when possible (6 players)
{
  const players = makePlayers(6);
  let history = [];
  for (let round = 1; round <= 3; round++) {
    const scored = withLiveScores(players, history);
    const pairs = generateSwissPairings(scored, history);
    assertValidRound(pairs, 6, `sim R${round}`);
    for (const g of pairs.filter((p) => !p.is_bye)) {
      assert(
        !hasPlayedBefore(history, g.player_a_id, g.player_b_id),
        `sim R${round}: rematch ${g.player_a_id} vs ${g.player_b_id}`
      );
    }
    // Alternate winners to churn standings
    for (const g of pairs) {
      if (g.is_bye) {
        history.push({
          player_a_id: g.player_a_id,
          player_b_id: g.player_b_id,
          is_bye: true,
          match_status: 'completed',
          result_winner: 'a',
        });
      } else {
        history.push({
          player_a_id: g.player_a_id,
          player_b_id: g.player_b_id,
          is_bye: false,
          match_status: 'completed',
          result_winner: round % 2 === 1 ? 'a' : 'b',
        });
      }
    }
  }
  ok('3-round sim (6 players): full coverage, no rematches');
}

// 7. fixtureGenerator Swiss path
{
  const players = makePlayers(8);
  const fixtures = generateFixtures(
    { tournament_type: 'swiss' },
    players,
    [],
    [],
    2
  );
  assert(fixtures.every((f) => f.round_number === 2), 'fixtureGenerator sets round_number');
  assert(fixtures.filter((f) => !f.is_bye).length === 4, 'fixtureGenerator Swiss: 4 games');
  ok('fixtureGenerator dispatches Swiss correctly');
}

// 8. Odd winner bracket: float ONE loser, winners mostly play winners
{
  // 10 players: R1 top half wins → 5 at 2pts, 5 at 0pts
  const players = makePlayers(10);
  const history = [
    { player_a_id: 'p1', player_b_id: 'p6', is_bye: false, match_status: 'completed', result_winner: 'a' },
    { player_a_id: 'p2', player_b_id: 'p7', is_bye: false, match_status: 'completed', result_winner: 'a' },
    { player_a_id: 'p3', player_b_id: 'p8', is_bye: false, match_status: 'completed', result_winner: 'a' },
    { player_a_id: 'p4', player_b_id: 'p9', is_bye: false, match_status: 'completed', result_winner: 'a' },
    { player_a_id: 'p5', player_b_id: 'p10', is_bye: false, match_status: 'completed', result_winner: 'a' },
  ];
  const scored = withLiveScores(players, history);
  const pairs = generateSwissPairings(scored, history);
  assertValidRound(pairs, 10, 'odd winners');

  const games = pairs.filter((p) => !p.is_bye);
  let ww = 0;
  let wl = 0;
  let ll = 0;
  for (const g of games) {
    const sa = scored.find((p) => p.user_id === g.player_a_id)?.score ?? 0;
    const sb = scored.find((p) => p.user_id === g.player_b_id)?.score ?? 0;
    if (sa === 2 && sb === 2) ww += 1;
    else if (sa === 0 && sb === 0) ll += 1;
    else wl += 1;
  }
  // 5 winners → 2 WW + 1 float WL; 4 leftover losers → 2 LL
  assert(ww === 2, `odd winners: expect 2 winner-winner, got ${ww}`);
  assert(wl === 1, `odd winners: expect 1 winner-loser float, got ${wl}`);
  assert(ll === 2, `odd winners: expect 2 loser-loser, got ${ll}`);
  const rematch = games.some((g) => hasPlayedBefore(history, g.player_a_id, g.player_b_id));
  assert(!rematch, 'odd winners: no rematches');
  ok('Odd winner bracket floats one loser (winners play winners)');
}

// 9. Unpairable rematch forced when everyone already played (4 players complete RR then Swiss)
{
  const players = makePlayers(4);
  const history = [
    { player_a_id: 'p1', player_b_id: 'p2', is_bye: false, match_status: 'completed', result_winner: 'a' },
    { player_a_id: 'p3', player_b_id: 'p4', is_bye: false, match_status: 'completed', result_winner: 'a' },
    { player_a_id: 'p1', player_b_id: 'p3', is_bye: false, match_status: 'completed', result_winner: 'a' },
    { player_a_id: 'p2', player_b_id: 'p4', is_bye: false, match_status: 'completed', result_winner: 'draw' },
    { player_a_id: 'p1', player_b_id: 'p4', is_bye: false, match_status: 'completed', result_winner: 'a' },
    { player_a_id: 'p2', player_b_id: 'p3', is_bye: false, match_status: 'completed', result_winner: 'b' },
  ];
  const scored = withLiveScores(players, history);
  const pairs = generateSwissPairings(scored, history);
  assertValidRound(pairs, 4, 'forced rematch');
  const mustRematch = pairs.filter((p) => !p.is_bye).every((g) =>
    hasPlayedBefore(history, g.player_a_id, g.player_b_id)
  );
  assert(mustRematch, 'When no fresh opponents left, rematches are allowed');
  ok('Forced rematch path when no legal new opponents');
}

console.log(`\nAll ${passed} Swiss pairing checks passed.`);
