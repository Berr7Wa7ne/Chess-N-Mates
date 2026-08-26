/**
 * Recommend tournament format from a fixed participant count.
 * Helps organizers pick Swiss / Knockout / Round Robin / Double RR.
 */

const { expectedRoundRobinRounds } = require('./roundRobin');
const { nextPowerOfTwo } = require('./knockout');

/**
 * @param {number} participantCount
 * @returns {{
 *   recommended: 'swiss' | 'knockout' | 'round_robin',
 *   recommended_legs: 1 | 2,
 *   recommended_rounds: number,
 *   rationale: string,
 *   options: Array<{ type: string, legs?: number, rounds: number, label: string, suitable: boolean, note: string }>
 * }}
 */
function recommendTournamentFormat(participantCount) {
  const n = Math.max(0, Number(participantCount) || 0);

  if (n < 2) {
    return {
      recommended: 'swiss',
      recommended_legs: 1,
      recommended_rounds: 3,
      rationale: 'Need at least 2 participants to run a tournament.',
      options: [],
    };
  }

  const rrRounds = expectedRoundRobinRounds(n);
  const koRounds = Math.ceil(Math.log2(n));
  // Swiss: enough rounds to differentiate ≈ log2(N), minimum 3, cap at N-1
  const swissRounds = Math.min(Math.max(3, Math.ceil(Math.log2(n)) + 1), Math.max(3, n - 1));

  const options = [
    {
      type: 'round_robin',
      legs: 1,
      rounds: rrRounds,
      label: 'Round Robin (single)',
      suitable: n <= 12,
      note:
        n <= 8
          ? 'Best fairness — everyone meets everyone.'
          : n <= 12
            ? 'Workable, but fixture load grows quickly.'
            : `Heavy: ${rrRounds} rounds and ${((n * (n - 1)) / 2)} games.`,
    },
    {
      type: 'round_robin',
      legs: 2,
      rounds: rrRounds,
      label: 'Double Round Robin',
      suitable: n <= 6,
      note:
        n <= 6
          ? 'Ideal for small invitational fields (home & away colors).'
          : `Very heavy: each pair plays twice (${n * (n - 1)} games).`,
    },
    {
      type: 'swiss',
      legs: 1,
      rounds: swissRounds,
      label: 'Swiss System',
      suitable: n >= 6,
      note:
        n >= 8
          ? `Strong default for ${n} players — score-based pairing each round.`
          : 'Works, but Round Robin is usually fairer at this size.',
    },
    {
      type: 'knockout',
      legs: 1,
      rounds: koRounds,
      label: 'Knockout',
      suitable: true,
      note:
        n === nextPowerOfTwo(n)
          ? `Clean bracket (${koRounds} rounds, no first-round byes).`
          : `Bracket pads to ${nextPowerOfTwo(n)} — top seeds get byes.`,
    },
  ];

  let recommended = 'swiss';
  let recommended_legs = 1;
  let recommended_rounds = swissRounds;
  let rationale = '';

  if (n <= 4) {
    recommended = 'round_robin';
    recommended_legs = 2;
    recommended_rounds = rrRounds;
    rationale = `${n} players — Double Round Robin gives the fairest ranking.`;
  } else if (n <= 8) {
    recommended = 'round_robin';
    recommended_legs = 1;
    recommended_rounds = rrRounds;
    rationale = `${n} players — Single Round Robin is fair and manageable.`;
  } else if (n <= 16) {
    recommended = 'swiss';
    recommended_legs = 1;
    recommended_rounds = swissRounds;
    rationale = `${n} players — Swiss is ideal; Knockout works for a cup format.`;
  } else {
    recommended = 'swiss';
    recommended_legs = 1;
    recommended_rounds = swissRounds;
    rationale = `${n} players — Swiss is the practical choice for large fields.`;
  }

  return {
    recommended,
    recommended_legs,
    recommended_rounds,
    rationale,
    options,
  };
}

module.exports = {
  recommendTournamentFormat,
};
