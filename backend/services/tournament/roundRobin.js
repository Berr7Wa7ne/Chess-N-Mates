/**
 * Round Robin / Double Round Robin via the circle method.
 *
 * - Odd N → dummy bye each round
 * - legs >= 2 → reverse colors as leg 2 in the same round_number
 * - All rounds generated on start (roundNumber === 1)
 */

const { isActiveParticipant, sortByScoreAndElo } = require('./scoring');

function generateRoundRobinPairsCircleMethod(players) {
  const n = players.length;
  if (n < 2) return [];

  const isOdd = n % 2 !== 0;
  const all = isOdd ? [...players, null] : [...players];
  const total = all.length;
  const rounds = [];

  for (let round = 0; round < total - 1; round++) {
    const roundPairs = [];

    for (let i = 0; i < total / 2; i++) {
      const a = all[i];
      const b = all[total - 1 - i];

      if (a !== null && b !== null) {
        // Alternate colors across rounds for fairness: odd rounds swap sides
        if (round % 2 === 1) {
          roundPairs.push({ player_a_id: b, player_b_id: a, is_bye: false });
        } else {
          roundPairs.push({ player_a_id: a, player_b_id: b, is_bye: false });
        }
      } else {
        const byePlayer = a !== null ? a : b;
        roundPairs.push({
          player_a_id: byePlayer,
          player_b_id: byePlayer,
          is_bye: true,
        });
      }
    }

    rounds.push(roundPairs);

    // Rotate: keep index 0 fixed, rotate the rest
    const last = all.pop();
    all.splice(1, 0, last);
  }

  return rounds;
}

function generateRoundRobinFixtures(participants, legs = 1) {
  const active = sortByScoreAndElo(participants.filter(isActiveParticipant));
  const playerIds = active.map((p) => p.user_id);
  const roundPairings = generateRoundRobinPairsCircleMethod(playerIds);

  if (roundPairings.length === 0) return [];

  const fixtures = [];

  for (let r = 0; r < roundPairings.length; r++) {
    for (const pair of roundPairings[r]) {
      fixtures.push({
        ...pair,
        round_number: r + 1,
        leg: 1,
      });

      if (legs >= 2 && !pair.is_bye) {
        fixtures.push({
          player_a_id: pair.player_b_id,
          player_b_id: pair.player_a_id,
          is_bye: false,
          round_number: r + 1,
          leg: 2,
        });
      }
    }
  }

  return fixtures;
}

/** Expected RR rounds for N players (odd or even). */
function expectedRoundRobinRounds(playerCount) {
  if (playerCount < 2) return 0;
  const even = playerCount % 2 === 0 ? playerCount : playerCount + 1;
  return even - 1;
}

module.exports = {
  generateRoundRobinPairsCircleMethod,
  generateRoundRobinFixtures,
  expectedRoundRobinRounds,
};
