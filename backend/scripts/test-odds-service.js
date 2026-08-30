/**
 * Smoke test for oddsService (no DB).
 * Run: node backend/scripts/test-odds-service.js
 */
const {
  matchOutcomeProbabilities,
  computeHeadToHead,
  computeMatchOdds,
  attachTournamentOdds,
} = require('../services/oddsService');
const { computeStandings } = require('../services/standingsService');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Higher Elo should be favorite
{
  const p = matchOutcomeProbabilities(1600, 1400, null);
  assert(p.win_pct_a > p.win_pct_b, 'higher Elo should win more often');
  assert(Math.abs(p.win_pct_a + p.draw_pct + p.win_pct_b - 1) < 1e-9, 'probs sum to 1');
}

// H2H blend pulls toward historical winner
{
  const h2h = { played: 4, wins: 4, draws: 0, losses: 0 };
  const p = matchOutcomeProbabilities(1400, 1600, h2h);
  assert(p.win_pct_a > 0.4, 'strong H2H should lift underdog win rate');
}

const participants = [
  { user_id: 'u1', participant_status: 'active', users: { display_name: 'Alice', chess_elo: 1700 } },
  { user_id: 'u2', participant_status: 'active', users: { display_name: 'Bob', chess_elo: 1400 } },
  { user_id: 'u3', participant_status: 'active', users: { display_name: 'Cara', chess_elo: 1500 } },
];

const matches = [
  {
    id: 'm1',
    competition_id: 'c1',
    round_number: 1,
    player_a_id: 'u1',
    player_b_id: 'u2',
    match_status: 'completed',
    result_winner: 'a',
    is_bye: false,
    is_absent: false,
    player_a: { display_name: 'Alice', chess_elo: 1700 },
    player_b: { display_name: 'Bob', chess_elo: 1400 },
  },
  {
    id: 'm2',
    competition_id: 'c1',
    round_number: 1,
    player_a_id: 'u3',
    player_b_id: 'u2',
    match_status: 'pending',
    result_winner: null,
    is_bye: false,
    is_absent: false,
    player_a: { display_name: 'Cara', chess_elo: 1500 },
    player_b: { display_name: 'Bob', chess_elo: 1400 },
  },
];

const h2h = computeHeadToHead('u1', 'u2', matches);
assert(h2h.played === 1 && h2h.wins === 1, 'H2H should count completed game');

const odds = computeMatchOdds(matches[1], matches);
assert(odds && odds.win_pct_a >= odds.win_pct_b, 'Cara should be favored vs Bob');
assert(odds.banter.includes('Cara') || odds.banter.includes('Toss-up'), 'banter present');

const standings = computeStandings(participants, matches, { tournamentType: 'round_robin' });
const withOdds = attachTournamentOdds(standings, participants, matches, {
  id: 'c1',
  tournament_type: 'round_robin',
  rounds: 3,
  current_round: 1,
}, { simulations: 800, seed: 42 });

const totalPct = withOdds.reduce((s, r) => s + (r.tournament_win_pct || 0), 0);
assert(Math.abs(totalPct - 100) < 1.5, `win% should ~100, got ${totalPct}`);
assert(withOdds[0].tournament_win_pct >= withOdds[withOdds.length - 1].tournament_win_pct, 'leader not worst odds');

console.log('oddsService OK');
console.log(
  withOdds.map((r) => `${r.display_name}: ${r.points}pts / ${r.tournament_win_pct}%`).join(' | ')
);
console.log('match banter:', odds.banter);
