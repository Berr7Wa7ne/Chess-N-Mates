/**
 * Client-side tournament format advisor (mirrors backend logic).
 */

export type AdvisableFormat = 'swiss' | 'knockout' | 'round_robin'

export interface FormatOption {
  type: AdvisableFormat
  legs: 1 | 2
  rounds: number
  label: string
  suitable: boolean
  note: string
}

export interface FormatAdvice {
  recommended: AdvisableFormat
  recommended_legs: 1 | 2
  recommended_rounds: number
  rationale: string
  options: FormatOption[]
}

function nextPowerOfTwo(n: number) {
  let p = 1
  while (p < n) p *= 2
  return Math.max(p, 2)
}

function expectedRoundRobinRounds(n: number) {
  if (n < 2) return 0
  const even = n % 2 === 0 ? n : n + 1
  return even - 1
}

export function recommendTournamentFormat(participantCount: number): FormatAdvice {
  const n = Math.max(0, Number(participantCount) || 0)

  if (n < 2) {
    return {
      recommended: 'swiss',
      recommended_legs: 1,
      recommended_rounds: 3,
      rationale: 'Need at least 2 participants to run a tournament.',
      options: [],
    }
  }

  const rrRounds = expectedRoundRobinRounds(n)
  const koRounds = Math.ceil(Math.log2(n))
  const swissRounds = Math.min(Math.max(3, Math.ceil(Math.log2(n)) + 1), Math.max(3, n - 1))

  const options: FormatOption[] = [
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
            : `Heavy: ${rrRounds} rounds and ${(n * (n - 1)) / 2} games.`,
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
  ]

  if (n <= 4) {
    return {
      recommended: 'round_robin',
      recommended_legs: 2,
      recommended_rounds: rrRounds,
      rationale: `${n} players — Double Round Robin gives the fairest ranking.`,
      options,
    }
  }
  if (n <= 8) {
    return {
      recommended: 'round_robin',
      recommended_legs: 1,
      recommended_rounds: rrRounds,
      rationale: `${n} players — Single Round Robin is fair and manageable.`,
      options,
    }
  }
  if (n <= 16) {
    return {
      recommended: 'swiss',
      recommended_legs: 1,
      recommended_rounds: swissRounds,
      rationale: `${n} players — Swiss is ideal; Knockout works for a cup format.`,
      options,
    }
  }
  return {
    recommended: 'swiss',
    recommended_legs: 1,
    recommended_rounds: swissRounds,
    rationale: `${n} players — Swiss is the practical choice for large fields.`,
    options,
  }
}
