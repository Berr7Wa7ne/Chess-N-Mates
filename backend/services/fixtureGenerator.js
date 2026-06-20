/**
 * Tournament fixture generation for Swiss, Knockout, and Round Robin formats.
 * Updated with proper Round Robin circle method, double-leg support,
 * and knockout bye handling.
 */

function hasPlayedBefore(existingMatches, playerA, playerB) {
  return existingMatches.some(
    (m) =>
      (m.player_a_id === playerA && m.player_b_id === playerB) ||
      (m.player_a_id === playerB && m.player_b_id === playerA)
  );
}

function sortByScoreAndElo(participants) {
  return [...participants].sort((a, b) => {
    const scoreDiff = Number(b.score) - Number(a.score);
    if (scoreDiff !== 0) return scoreDiff;
    return (b.chess_elo || 0) - (a.chess_elo || 0);
  });
}

// ─── Swiss System ───────────────────────────────────────────────

function generateSwissPairings(participants, existingMatches) {
  const active = sortByScoreAndElo(
    participants.filter((p) => ['registered', 'active'].includes(p.participant_status))
  );

  const pairs = [];
  const used = new Set();

  const scoreGroups = new Map();
  for (const p of active) {
    const key = String(p.score ?? 0);
    if (!scoreGroups.has(key)) scoreGroups.set(key, []);
    scoreGroups.get(key).push(p);
  }

  const orderedGroups = [...scoreGroups.entries()].sort(
    (a, b) => Number(b[0]) - Number(a[0])
  );

  let pool = orderedGroups.flatMap(([, group]) => sortByScoreAndElo(group));

  while (pool.length >= 2) {
    const playerA = pool.find((p) => !used.has(p.user_id));
    if (!playerA) break;

    const sameScore = pool.filter(
      (p) => !used.has(p.user_id) && String(p.score ?? 0) === String(playerA.score ?? 0)
    );

    let opponent = sameScore.find(
      (p) => p.user_id !== playerA.user_id && !hasPlayedBefore(existingMatches, playerA.user_id, p.user_id)
    );

    if (!opponent) {
      opponent = pool.find(
        (p) => p.user_id !== playerA.user_id && !used.has(p.user_id)
      );
    }

    if (!opponent) break;

    pairs.push({ player_a_id: playerA.user_id, player_b_id: opponent.user_id });
    used.add(playerA.user_id);
    used.add(opponent.user_id);
    pool = pool.filter((p) => !used.has(p.user_id));
  }

  return pairs;
}

// ─── Knockout ────────────────────────────────────────────────────

function generateKnockoutPairings(participants, roundNumber, completedMatches) {
  const active = sortByScoreAndElo(
    participants.filter((p) => p.participant_status === 'active' || p.participant_status === 'registered')
  );

  if (roundNumber === 1) {
    const seeded = sortByScoreAndElo(active);
    const pairs = [];

    // Standard seeding: 1 vs N, 2 vs N-1, etc.
    let left = 0;
    let right = seeded.length - 1;

    while (left < right) {
      pairs.push({
        player_a_id: seeded[left].user_id,
        player_b_id: seeded[right].user_id,
      });
      left += 1;
      right -= 1;
    }

    // Handle bye (odd number of players) — player gets a walkover
    if (left === right) {
      pairs.push({
        player_a_id: seeded[left].user_id,
        player_b_id: seeded[left].user_id, // self-pair = bye
        is_bye: true,
      });
    }

    return pairs;
  }

  // Subsequent rounds: winners from previous round
  const roundMatches = completedMatches.filter((m) => m.round_number === roundNumber - 1);
  const winners = [];

  for (const match of roundMatches) {
    if (match.is_bye) {
      // Bye winner is the player who had the bye
      winners.push(match.player_a_id);
    } else if (match.result_winner === 'a') {
      winners.push(match.player_a_id);
    } else if (match.result_winner === 'b') {
      winners.push(match.player_b_id);
    }
    // If draw in knockout — treat as unresolved (should not happen normally)
  }

  const pairs = [];
  for (let i = 0; i < winners.length; i += 2) {
    if (i + 1 < winners.length) {
      pairs.push({ player_a_id: winners[i], player_b_id: winners[i + 1] });
    } else {
      // Another bye if odd number of winners
      pairs.push({ player_a_id: winners[i], player_b_id: winners[i], is_bye: true });
    }
  }

  return pairs;
}

// ─── Round Robin (Proper Circle Method) ──────────────────────────

/**
 * Generates round robin pairings using the standard circle method.
 * Guarantees each player faces every other player exactly once per leg.
 * 
 * Circle method algorithm:
 * - Fix one player (the "anchor")
 * - Rotate the other N-1 players around the anchor
 * - Each rotation produces one round of pairings
 */
function generateRoundRobinPairsCircleMethod(players) {
  const n = players.length;
  if (n < 2) return [];

  // If odd, add a "dummy" player (bye)
  const isOdd = n % 2 !== 0;
  const all = isOdd ? [...players, null] : [...players];
  const total = all.length; // even now

  const rounds = [];

  // The circle method: fix the first element, rotate the rest
  for (let round = 0; round < total - 1; round++) {
    const roundPairs = [];

    for (let i = 0; i < total / 2; i++) {
      const a = all[i];
      const b = all[total - 1 - i];

      if (a !== null && b !== null) {
        roundPairs.push({ player_a_id: a, player_b_id: b, is_bye: false });
      } else {
        // If one is null, that player gets a bye
        const byePlayer = a !== null ? a : b;
        roundPairs.push({
          player_a_id: byePlayer,
          player_b_id: byePlayer,
          is_bye: true,
        });
      }
    }

    rounds.push(roundPairs);

    // Rotate: keep first element fixed, rotate the rest clockwise
    const last = all.pop();
    all.splice(1, 0, last);
  }

  return rounds;
}

function generateRoundRobinFixtures(participants, totalRounds, legs = 1) {
  const active = sortByScoreAndElo(
    participants.filter((p) => ['registered', 'active'].includes(p.participant_status))
  );

  const playerIds = active.map((p) => p.user_id);
  const roundPairings = generateRoundRobinPairsCircleMethod(playerIds);

  if (roundPairings.length === 0) return [];

  const fixtures = [];

  // Single leg: use rounds as-is
  for (let r = 0; r < roundPairings.length; r++) {
    for (const pair of roundPairings[r]) {
      fixtures.push({
        ...pair,
        round_number: r + 1,
      });
    }
  }

  // Double leg: mirror all pairings with swapped sides
  if (legs >= 2) {
    const offset = roundPairings.length;
    for (let r = 0; r < roundPairings.length; r++) {
      for (const pair of roundPairings[r]) {
        fixtures.push({
          player_a_id: pair.player_b_id,
          player_b_id: pair.player_a_id,
          round_number: r + 1 + offset,
        });
      }
    }
  }

  return fixtures;
}

// ─── Main Entry Point ────────────────────────────────────────────

function generateFixtures(competition, participants, existingMatches, completedMatches, roundNumber) {
  const { tournament_type, round_robin_legs = 1 } = competition;

  if (tournament_type === 'swiss') {
    return generateSwissPairings(participants, existingMatches).map((p) => ({
      ...p,
      round_number: roundNumber,
    }));
  }

  if (tournament_type === 'knockout') {
    return generateKnockoutPairings(participants, roundNumber, completedMatches).map((p) => ({
      ...p,
      round_number: roundNumber,
    }));
  }

  if (tournament_type === 'round_robin') {
    // Round robin generates ALL rounds at once on round 1
    if (roundNumber === 1) {
      return generateRoundRobinFixtures(
        participants,
        competition.rounds || participants.length - 1,
        round_robin_legs
      );
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
};