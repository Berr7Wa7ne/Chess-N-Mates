/**
 * Swiss-system pairing.
 *
 * Features:
 * - Live scores from completed matches (byes included)
 * - Odd-player bye to lowest eligible player (fewest prior byes)
 * - Score-group pairing with top-half vs bottom-half preference
 * - Hard rematch avoidance when a legal pairing exists
 * - Color balancing (player_a = white)
 * - Float to adjacent score groups when a bracket is stuck
 */

const {
  isActiveParticipant,
  sortByScoreAndElo,
  hasPlayedBefore,
  countByes,
  withLiveScores,
  assignColors,
} = require('./scoring');

function chooseByePlayer(players, existingMatches) {
  // Prefer: fewest byes → lowest score → lowest ELO → stable id
  const ranked = [...players].sort((a, b) => {
    const byeDiff = countByes(a.user_id, existingMatches) - countByes(b.user_id, existingMatches);
    if (byeDiff !== 0) return byeDiff;
    const scoreDiff = Number(a.score ?? 0) - Number(b.score ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    const eloDiff = (a.chess_elo || 0) - (b.chess_elo || 0);
    if (eloDiff !== 0) return eloDiff;
    return String(a.user_id).localeCompare(String(b.user_id));
  });
  return ranked[0] || null;
}

/**
 * Try to find a perfect matching within `pool` avoiding rematches.
 * Uses backtracking; pool sizes for Swiss rounds are small enough.
 */
function tryPairPool(pool, existingMatches) {
  if (pool.length === 0) return [];
  if (pool.length % 2 !== 0) return null;

  const ids = pool.map((p) => p.user_id);
  const byId = new Map(pool.map((p) => [p.user_id, p]));

  // Order: attempt higher seeds first (already sorted)
  function search(remaining) {
    if (remaining.length === 0) return [];
    const a = remaining[0];
    const rest = remaining.slice(1);

    // Prefer opponents in reverse order (top vs bottom), then any legal
    const candidates = [...rest].reverse();

    const ordered = [
      ...candidates.filter((b) => !hasPlayedBefore(existingMatches, a, b)),
      ...candidates.filter((b) => hasPlayedBefore(existingMatches, a, b)),
    ];

    // Deduplicate while preserving order
    const seen = new Set();
    const unique = [];
    for (const b of ordered) {
      if (seen.has(b)) continue;
      seen.add(b);
      unique.push(b);
    }

    for (const b of unique) {
      if (hasPlayedBefore(existingMatches, a, b)) {
        // Only allow rematch if no rematch-free pairing exists at this branch —
        // try rematch-free first (already ordered), fall through only when needed.
      }
      const next = rest.filter((id) => id !== b);
      // Prefer non-rematch: skip rematch candidates until rematch-free exhausted
      const isRematch = hasPlayedBefore(existingMatches, a, b);
      if (isRematch) continue;

      const sub = search(next);
      if (sub !== null) {
        return [{ a, b }, ...sub];
      }
    }

    // Second pass: allow rematches if unavoidable
    for (const b of unique) {
      if (!hasPlayedBefore(existingMatches, a, b)) continue;
      const next = rest.filter((id) => id !== b);
      const sub = search(next);
      if (sub !== null) {
        return [{ a, b }, ...sub];
      }
    }

    return null;
  }

  // Prefer classic Swiss: pair i with i + n/2 when legal (accelerates search quality)
  const n = ids.length;
  const half = n / 2;
  const preferred = [];
  const used = new Set();
  let classicOk = true;

  for (let i = 0; i < half; i++) {
    const a = ids[i];
    const b = ids[i + half];
    if (hasPlayedBefore(existingMatches, a, b)) {
      classicOk = false;
      break;
    }
    preferred.push({ a, b });
    used.add(a);
    used.add(b);
  }

  if (classicOk && used.size === n) {
    return preferred.map(({ a, b }) => ({
      ...assignColors(a, b, existingMatches),
      is_bye: false,
    }));
  }

  const result = search(ids);
  if (!result) return null;

  return result.map(({ a, b }) => ({
    ...assignColors(a, b, existingMatches),
    is_bye: false,
  }));
}

/**
 * Pair across floating score groups: merge adjacent groups until even and pairable.
 */
function pairWithFloats(sortedPlayers, existingMatches) {
  const pairs = [];
  let i = 0;

  while (i < sortedPlayers.length) {
    // Build a score bracket starting at i
    const score = Number(sortedPlayers[i].score ?? 0);
    let j = i;
    while (j < sortedPlayers.length && Number(sortedPlayers[j].score ?? 0) === score) {
      j += 1;
    }

    let pool = sortedPlayers.slice(i, j);

    // Grow pool by floating down until even and pairable (or end of list)
    while (pool.length % 2 !== 0 || tryPairPool(pool, existingMatches) === null) {
      if (j >= sortedPlayers.length) {
        // Stuck at end with odd/unpairable — break and let remainder handler deal
        break;
      }
      // Float next player(s) from lower group into this pool
      const nextScore = Number(sortedPlayers[j].score ?? 0);
      while (j < sortedPlayers.length && Number(sortedPlayers[j].score ?? 0) === nextScore) {
        pool.push(sortedPlayers[j]);
        j += 1;
      }
      if (pool.length > sortedPlayers.length) break;
      // Safety: if pool already includes everyone remaining, stop growing
      if (j >= sortedPlayers.length) break;
      // If even and pairable, stop; else continue floating
      if (pool.length % 2 === 0 && tryPairPool(pool, existingMatches) !== null) break;
    }

    const paired = tryPairPool(pool, existingMatches);
    if (paired) {
      pairs.push(...paired);
      i = j;
      continue;
    }

    // Fallback greedy for this pool (should be rare)
    const used = new Set();
    const greedy = [];
    for (const p of pool) {
      if (used.has(p.user_id)) continue;
      const opp = pool.find(
        (q) =>
          q.user_id !== p.user_id &&
          !used.has(q.user_id) &&
          !hasPlayedBefore(existingMatches, p.user_id, q.user_id)
      ) || pool.find((q) => q.user_id !== p.user_id && !used.has(q.user_id));

      if (!opp) break;
      greedy.push({
        ...assignColors(p.user_id, opp.user_id, existingMatches),
        is_bye: false,
      });
      used.add(p.user_id);
      used.add(opp.user_id);
    }
    pairs.push(...greedy);
    i = j;
  }

  return pairs;
}

function generateSwissPairings(participants, existingMatches = []) {
  const active = withLiveScores(
    participants.filter(isActiveParticipant),
    existingMatches
  );

  if (active.length < 2) return [];

  const sorted = sortByScoreAndElo(active);
  const pairs = [];
  let pool = sorted;

  if (pool.length % 2 === 1) {
    const byePlayer = chooseByePlayer(pool, existingMatches);
    if (byePlayer) {
      pairs.push({
        player_a_id: byePlayer.user_id,
        player_b_id: byePlayer.user_id,
        is_bye: true,
      });
      pool = pool.filter((p) => p.user_id !== byePlayer.user_id);
    }
  }

  if (pool.length >= 2) {
    pairs.push(...pairWithFloats(sortByScoreAndElo(pool), existingMatches));
  }

  return pairs;
}

module.exports = {
  generateSwissPairings,
  chooseByePlayer,
  tryPairPool,
};
