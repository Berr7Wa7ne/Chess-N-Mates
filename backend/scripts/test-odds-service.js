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
  { user_id: 'u1', participant_status: 'active', users: { display_name: 'Alice', chess_com_rating: 1700 } },
  { user_id: 'u2', participant_status: 'active', users: { display_name: 'Bob', chess_com_rating: 1400 } },
  { user_id: 'u3', participant_status: 'active', users: { display_name: 'Cara', chess_com_rating: 1500 } },
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
    player_a: { display_name: 'Alice', chess_com_rating: 1700, chess_elo: 1000 },
    player_b: { display_name: 'Bob', chess_com_rating: 1400, chess_elo: 1000 },
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
    player_a: { display_name: 'Cara', chess_com_rating: 1500, chess_elo: 1000 },
    player_b: { display_name: 'Bob', chess_com_rating: 1400, chess_elo: 1000 },
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

// Swiss: Win% must drop after a favorite loses several games (not stay ~50% on Elo alone)
{
  const swissParts = [
    { user_id: 's1', participant_status: 'active', users: { display_name: 'Fav', chess_com_rating: 2000 } },
    { user_id: 's2', participant_status: 'active', users: { display_name: 'Mid', chess_com_rating: 1600 } },
    { user_id: 's3', participant_status: 'active', users: { display_name: 'Low', chess_com_rating: 1400 } },
    { user_id: 's4', participant_status: 'active', users: { display_name: 'Peer', chess_com_rating: 1950 } },
  ];

  // Before any games — favorite should have a real share of Win%
  const beforeMatches = [];
  const beforeStandings = computeStandings(swissParts, beforeMatches, { tournamentType: 'swiss' });
  const beforeOdds = attachTournamentOdds(beforeStandings, swissParts, beforeMatches, {
    id: 'swiss1',
    tournament_type: 'swiss',
    rounds: 6,
    current_round: 0,
  }, { simulations: 600, seed: 7 });
  const favBefore = beforeOdds.find((r) => r.user_id === 's1');
  assert(
    favBefore && favBefore.tournament_win_pct >= 25,
    `favorite should have real Win% before, got ${favBefore?.tournament_win_pct}`
  );

  // Fav loses R1–R5 while Peer wins out
  const afterMatches = [
    { id: 'r1', round_number: 1, player_a_id: 's1', player_b_id: 's4', match_status: 'completed', result_winner: 'b', is_bye: false, is_absent: false },
    { id: 'r1b', round_number: 1, player_a_id: 's2', player_b_id: 's3', match_status: 'completed', result_winner: 'a', is_bye: false, is_absent: false },
    { id: 'r2', round_number: 2, player_a_id: 's1', player_b_id: 's2', match_status: 'completed', result_winner: 'b', is_bye: false, is_absent: false },
    { id: 'r2b', round_number: 2, player_a_id: 's4', player_b_id: 's3', match_status: 'completed', result_winner: 'a', is_bye: false, is_absent: false },
    { id: 'r3', round_number: 3, player_a_id: 's1', player_b_id: 's3', match_status: 'completed', result_winner: 'b', is_bye: false, is_absent: false },
    { id: 'r3b', round_number: 3, player_a_id: 's4', player_b_id: 's2', match_status: 'completed', result_winner: 'a', is_bye: false, is_absent: false },
    { id: 'r4', round_number: 4, player_a_id: 's4', player_b_id: 's1', match_status: 'completed', result_winner: 'a', is_bye: false, is_absent: false },
    { id: 'r4b', round_number: 4, player_a_id: 's2', player_b_id: 's3', match_status: 'completed', result_winner: 'a', is_bye: false, is_absent: false },
    { id: 'r5', round_number: 5, player_a_id: 's1', player_b_id: 's2', match_status: 'completed', result_winner: 'b', is_bye: false, is_absent: false },
    { id: 'r5b', round_number: 5, player_a_id: 's4', player_b_id: 's3', match_status: 'completed', result_winner: 'a', is_bye: false, is_absent: false },
  ];
  const afterStandings = computeStandings(swissParts, afterMatches, { tournamentType: 'swiss' });
  const afterOdds = attachTournamentOdds(afterStandings, swissParts, afterMatches, {
    id: 'swiss1',
    tournament_type: 'swiss',
    rounds: 6,
    current_round: 5,
  }, { simulations: 800, seed: 7 });

  const favAfter = afterOdds.find((r) => r.user_id === 's1');
  const peerAfter = afterOdds.find((r) => r.user_id === 's4');
  assert(
    favAfter && favAfter.tournament_win_pct < 15,
    `loser Win% should crash, got ${favAfter?.tournament_win_pct}%`
  );
  assert(
    peerAfter && peerAfter.tournament_win_pct > 50,
    `leader should dominate Win%, got ${peerAfter?.tournament_win_pct}%`
  );
  assert(
    favAfter.tournament_win_pct < favBefore.tournament_win_pct - 10,
    `Win% must drop after losses (${favBefore.tournament_win_pct} → ${favAfter.tournament_win_pct})`
  );

  // H2H should tilt a pending rematch
  const rematch = {
    id: 'r6',
    round_number: 6,
    player_a_id: 's1',
    player_b_id: 's4',
    match_status: 'pending',
    result_winner: null,
    is_bye: false,
    is_absent: false,
    player_a: { display_name: 'Fav', chess_com_rating: 2000 },
    player_b: { display_name: 'Peer', chess_com_rating: 1950 },
  };
  const rematchOdds = computeMatchOdds(rematch, afterMatches);
  assert(rematchOdds && rematchOdds.model.sources.includes('h2h'), 'rematch odds should include H2H');
  assert(rematchOdds.h2h.played >= 2, 'H2H should count prior meetings');
  assert(
    rematchOdds.favorite === 'b' || rematchOdds.win_pct_b > rematchOdds.win_pct_a,
    'Peer H2H edge should favor Peer'
  );

  console.log(
    'Swiss loss drop OK:',
    `Fav ${favBefore.tournament_win_pct}% → ${favAfter.tournament_win_pct}% | Peer ${peerAfter.tournament_win_pct}%`
  );
  console.log('Rematch banter:', rematchOdds.banter);
}
