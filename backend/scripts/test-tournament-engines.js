/**
 * Quick self-check for tournament engines (no external test runner).
 * Run: node backend/scripts/test-tournament-engines.js
 */

const { generateFixtures, recommendTournamentFormat } = require('../services/fixtureGenerator');
const { computeStandings } = require('../services/standingsService');
const { generateSwissPairings } = require('../services/tournament/swiss');
const { nextPowerOfTwo, seedBracketSlots } = require('../services/tournament/knockout');
const { generateRoundRobinFixtures } = require('../services/tournament/roundRobin');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function makePlayers(n) {
  return Array.from({ length: n }, (_, i) => ({
    user_id: `p${i + 1}`,
    score: 0,
    chess_elo: 2000 - i * 10,
    participant_status: 'active',
    users: { display_name: `Player ${i + 1}`, chess_elo: 2000 - i * 10 },
  }));
}

// ── Swiss: odd field gets a bye ──
{
  const players = makePlayers(5);
  const pairs = generateSwissPairings(players, []);
  const byes = pairs.filter((p) => p.is_bye);
  const games = pairs.filter((p) => !p.is_bye);
  assert(byes.length === 1, 'Swiss odd: expect 1 bye');
  assert(games.length === 2, 'Swiss odd: expect 2 games');
  const used = new Set();
  for (const p of pairs) {
    used.add(p.player_a_id);
    if (!p.is_bye) used.add(p.player_b_id);
  }
  assert(used.size === 5, 'Swiss odd: all players paired or bye');
}

// ── Swiss: rematch avoidance ──
{
  const players = makePlayers(4);
  const history = [
    { player_a_id: 'p1', player_b_id: 'p2', is_bye: false, match_status: 'completed', result_winner: 'a' },
    { player_a_id: 'p3', player_b_id: 'p4', is_bye: false, match_status: 'completed', result_winner: 'a' },
  ];
  // After wins, p1 & p3 lead — should prefer p1-p3 and p2-p4 (not rematches)
  const withScores = players.map((p) => ({
    ...p,
    score: p.user_id === 'p1' || p.user_id === 'p3' ? 2 : 0,
  }));
  const pairs = generateSwissPairings(withScores, history);
  const games = pairs.filter((p) => !p.is_bye);
  assert(games.length === 2, 'Swiss rematch: 2 games');
  const rematch = games.some(
    (g) =>
      (g.player_a_id === 'p1' && g.player_b_id === 'p2') ||
      (g.player_a_id === 'p2' && g.player_b_id === 'p1') ||
      (g.player_a_id === 'p3' && g.player_b_id === 'p4') ||
      (g.player_a_id === 'p4' && g.player_b_id === 'p3')
  );
  assert(!rematch, 'Swiss rematch: should avoid prior opponents');
}

// ── Knockout: power-of-2 padding ──
{
  assert(nextPowerOfTwo(5) === 8, 'KO pad 5→8');
  assert(seedBracketSlots(8).length === 8, 'seed slots length 8');
  const fixtures = generateFixtures(
    { tournament_type: 'knockout' },
    makePlayers(5),
    [],
    [],
    1
  );
  const byes = fixtures.filter((f) => f.is_bye);
  const games = fixtures.filter((f) => !f.is_bye);
  assert(byes.length === 3, `KO R1: 3 byes for 5 players, got ${byes.length}`);
  assert(games.length === 1, `KO R1: 1 real game for 5 players, got ${games.length}`);
}

// ── Round Robin / Double RR ──
{
  const single = generateRoundRobinFixtures(makePlayers(4), 1);
  assert(single.length === 6, `RR4 single: 6 games, got ${single.length}`);
  assert(single.every((f) => f.leg === 1), 'RR single: all leg 1');

  const dbl = generateRoundRobinFixtures(makePlayers(4), 2);
  assert(dbl.length === 12, `RR4 double: 12 games, got ${dbl.length}`);
  assert(dbl.filter((f) => f.leg === 2).length === 6, 'RR double: 6 leg-2 games');

  const odd = generateRoundRobinFixtures(makePlayers(3), 1);
  const byeRounds = odd.filter((f) => f.is_bye);
  assert(byeRounds.length === 3, `RR3: 3 byes across rounds, got ${byeRounds.length}`);
}

// ── Swiss tiebreaks: Buchholz / SB ──
{
  const participants = makePlayers(3);
  const matches = [
    {
      player_a_id: 'p1',
      player_b_id: 'p2',
      match_status: 'completed',
      result_winner: 'a',
      round_number: 1,
    },
    {
      player_a_id: 'p1',
      player_b_id: 'p3',
      match_status: 'completed',
      result_winner: 'a',
      round_number: 2,
    },
    {
      player_a_id: 'p2',
      player_b_id: 'p3',
      match_status: 'completed',
      result_winner: 'draw',
      round_number: 3,
    },
  ];
  const standings = computeStandings(participants, matches, { tournamentType: 'swiss' });
  assert(standings[0].user_id === 'p1', 'Swiss TB: p1 first on points');
  assert(typeof standings[0].buchholz === 'number', 'Swiss TB: buchholz present');
  assert(typeof standings[0].sonneborn_berger === 'number', 'Swiss TB: SB present');
  // p2 and p3 both have 1 point; Buchholz should separate (p2 played p1 who has 4)
  assert(standings[1].points === standings[2].points, 'Swiss TB: p2/p3 tied on points');
  assert(standings[1].buchholz >= standings[2].buchholz, 'Swiss TB: higher BH ranks above');
}

// ── Advisor ──
{
  const small = recommendTournamentFormat(4);
  assert(small.recommended === 'round_robin' && small.recommended_legs === 2, 'Advisor: 4 → DRR');
  const mid = recommendTournamentFormat(8);
  assert(mid.recommended === 'round_robin', 'Advisor: 8 → RR');
  const large = recommendTournamentFormat(24);
  assert(large.recommended === 'swiss', 'Advisor: 24 → Swiss');
}

console.log('All tournament engine checks passed.');
