/**
 * Single-elimination knockout bracket.
 *
 * Round 1:
 * - Seed by score then ELO
 * - Pad to next power of 2 with byes for top seeds
 * - Standard bracket pairing so winners meet correctly later
 *
 * Later rounds:
 * - Winners advance in bracket order (match insertion order)
 * - Byes auto-advance
 * - Draws do not produce a winner (caller should not advance)
 */

const { isActiveParticipant, sortByScoreAndElo } = require('./scoring');

function nextPowerOfTwo(n) {
  let p = 1;
  while (p < n) p *= 2;
  return Math.max(p, 2);
}

/**
 * Standard single-elim seed positions for a power-of-2 bracket.
 * Index = bracket slot, value = seed number (1-based) or null for empty.
 * Algorithm places seed 1 at top, then mirrors so 1 meets 2 in the final.
 */
function seedBracketSlots(bracketSize) {
  const slots = [1];
  let size = 1;
  while (size < bracketSize) {
    const next = [];
    const sum = size * 2 + 1;
    for (const seed of slots) {
      next.push(seed);
      next.push(sum - seed);
    }
    slots.length = 0;
    slots.push(...next);
    size *= 2;
  }
  return slots; // length === bracketSize, values 1..bracketSize
}

function generateKnockoutRound1(participants) {
  const seeded = sortByScoreAndElo(participants.filter(isActiveParticipant));
  if (seeded.length < 2) return [];

  const bracketSize = nextPowerOfTwo(seeded.length);
  const seedPositions = seedBracketSlots(bracketSize);

  // Map seed number → player (seeds beyond field are byes)
  const bySeed = new Map();
  seeded.forEach((p, idx) => bySeed.set(idx + 1, p));

  const pairs = [];
  for (let i = 0; i < seedPositions.length; i += 2) {
    const seedA = seedPositions[i];
    const seedB = seedPositions[i + 1];
    const playerA = bySeed.get(seedA) || null;
    const playerB = bySeed.get(seedB) || null;

    if (playerA && playerB) {
      pairs.push({
        player_a_id: playerA.user_id,
        player_b_id: playerB.user_id,
        is_bye: false,
        bracket_slot: i / 2,
      });
    } else if (playerA && !playerB) {
      pairs.push({
        player_a_id: playerA.user_id,
        player_b_id: playerA.user_id,
        is_bye: true,
        bracket_slot: i / 2,
      });
    } else if (!playerA && playerB) {
      pairs.push({
        player_a_id: playerB.user_id,
        player_b_id: playerB.user_id,
        is_bye: true,
        bracket_slot: i / 2,
      });
    }
    // both null → empty slot (should not happen with power-of-2 padding)
  }

  return pairs;
}

function matchWinnerId(match) {
  if (match.is_bye) return match.player_a_id;
  if (match.result_winner === 'a') return match.player_a_id;
  if (match.result_winner === 'b') return match.player_b_id;
  return null; // draw / unresolved
}

function matchLoserId(match) {
  if (match.is_bye) return null;
  if (match.result_winner === 'a') return match.player_b_id;
  if (match.result_winner === 'b') return match.player_a_id;
  return null;
}

function generateKnockoutLaterRound(completedMatches, roundNumber) {
  const prev = (completedMatches || [])
    .filter((m) => m.round_number === roundNumber - 1)
    .slice()
    .sort((a, b) => {
      // Preserve bracket order from creation
      if (a.created_at && b.created_at) {
        return new Date(a.created_at) - new Date(b.created_at);
      }
      return String(a.id || '').localeCompare(String(b.id || ''));
    });

  const winners = [];
  for (const match of prev) {
    const w = matchWinnerId(match);
    if (w) winners.push(w);
  }

  if (winners.length <= 1) return [];

  const pairs = [];
  for (let i = 0; i < winners.length; i += 2) {
    if (i + 1 < winners.length) {
      pairs.push({
        player_a_id: winners[i],
        player_b_id: winners[i + 1],
        is_bye: false,
        bracket_slot: i / 2,
      });
    } else {
      pairs.push({
        player_a_id: winners[i],
        player_b_id: winners[i],
        is_bye: true,
        bracket_slot: i / 2,
      });
    }
  }

  return pairs;
}

function generateKnockoutPairings(participants, roundNumber, completedMatches) {
  if (roundNumber === 1) {
    return generateKnockoutRound1(participants);
  }
  return generateKnockoutLaterRound(completedMatches, roundNumber);
}

/** Losers of a completed knockout round (for auto-eliminate). */
function getKnockoutLosers(completedMatches, roundNumber) {
  return (completedMatches || [])
    .filter((m) => m.round_number === roundNumber && !m.is_bye)
    .map(matchLoserId)
    .filter(Boolean);
}

module.exports = {
  generateKnockoutPairings,
  generateKnockoutRound1,
  nextPowerOfTwo,
  seedBracketSlots,
  matchWinnerId,
  matchLoserId,
  getKnockoutLosers,
};
