/**
 * Tournament fixture generation — Swiss, Knockout, Round Robin / Double RR.
 */

const { generateSwissPairings } = require('./tournament/swiss');
const { generateKnockoutPairings } = require('./tournament/knockout');
const { generateRoundRobinFixtures, generateRoundRobinPairsCircleMethod } = require('./tournament/roundRobin');
const { recommendTournamentFormat } = require('./tournament/advisor');

function generateFixtures(competition, participants, existingMatches, completedMatches, roundNumber) {
  const { tournament_type, round_robin_legs = 1, match_length } = competition;

  // Double-game RR uses legs; double_game on competition also implies 2 legs for RR
  let legs = Number(round_robin_legs) || 1;
  if (tournament_type === 'round_robin' && match_length === 'double_game') {
    legs = Math.max(legs, 2);
  }

  if (tournament_type === 'swiss') {
    return generateSwissPairings(participants, existingMatches).map((p) => ({
      ...p,
      round_number: roundNumber,
      leg: 1,
    }));
  }

  if (tournament_type === 'knockout') {
    return generateKnockoutPairings(participants, roundNumber, completedMatches).map((p) => ({
      ...p,
      round_number: roundNumber,
      leg: 1,
    }));
  }

  if (tournament_type === 'round_robin') {
    // All rounds generated up front on round 1
    if (roundNumber === 1) {
      return generateRoundRobinFixtures(participants, legs);
    }
    return [];
  }

  return [];
}

module.exports = {
  generateFixtures,
  generateSwissPairings,
  generateKnockoutPairings,
  generateRoundRobinFixtures,
  generateRoundRobinPairsCircleMethod,
  recommendTournamentFormat,
};
