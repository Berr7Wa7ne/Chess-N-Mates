/**
 * Swiss-system pairing.
 *
 * Features:
 * - Live scores from completed matches (byes included)
 * - Odd-player bye to lowest eligible player (fewest prior byes)
 * - Score-group pairing with top-half vs bottom-half preference
 * - HARD rematch avoidance — players who already met are never paired again
 * - Color balancing (player_a = white)
 * - Float to adjacent score groups when a bracket cannot be paired rematch-free
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
 * Perfect rematch-free matching within `pool`, or null if impossible.
 * Never pairs players who have already met.
 */
function tryPairPool(pool, existingMatches) {
  if (pool.length === 0) return [];
  if (pool.length % 2 !== 0) return null;

  const ids = pool.map((p) => p.user_id);

  function search(remaining) {
    if (remaining.length === 0) return [];
    const a = remaining[0];
    const rest = remaining.slice(1);

    // Prefer classic Swiss feel: top vs bottom of the remaining list
    const candidates = [...rest].reverse();

    for (const b of candidates) {
      if (hasPlayedBefore(existingMatches, a, b)) continue;
      const next = rest.filter((id) => id !== b);
      const sub = search(next);
      if (sub !== null) {
        return [{ a, b }, ...sub];
      }
    }

    return null;
  }

  // Fast path: classic i vs i+n/2 when every pair is rematch-free
  const n = ids.length;
  const half = n / 2;
  const preferred = [];
  let classicOk = true;

  for (let i = 0; i < half; i++) {
    const a = ids[i];
    const b = ids[i + half];
    if (hasPlayedBefore(existingMatches, a, b)) {
      classicOk = false;
      break;
    }
    preferred.push({ a, b });
  }

  if (classicOk) {
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
 * Greedy rematch-free pairs only (no rematch fallback).
 * Unpaired players are returned so the caller can assign byes / float.
 */
function greedyRematchFree(pool, existingMatches) {
  const used = new Set();
  const pairs = [];
  const unpaired = [];

  for (const p of pool) {
    if (used.has(p.user_id)) continue;
    const opp = pool.find(
      (q) =>
        q.user_id !== p.user_id &&
        !used.has(q.user_id) &&
        !hasPlayedBefore(existingMatches, p.user_id, q.user_id)
    );
    if (!opp) {
      unpaired.push(p);
      continue;
    }
    pairs.push({
      ...assignColors(p.user_id, opp.user_id, existingMatches),
      is_bye: false,
    });
    used.add(p.user_id);
    used.add(opp.user_id);
  }

  return { pairs, unpaired };
}

/**
 * Pair across floating score groups.
 * Odd / rematch-stuck brackets float ONE player at a time from the next lower
 * group until a rematch-free pairing exists.
 */
function pairWithFloats(sortedPlayers, existingMatches) {
  const pairs = [];
  let i = 0;

  while (i < sortedPlayers.length) {
    const score = Number(sortedPlayers[i].score ?? 0);
    let j = i;
    while (j < sortedPlayers.length && Number(sortedPlayers[j].score ?? 0) === score) {
      j += 1;
    }

    let pool = sortedPlayers.slice(i, j);

    while (
      (pool.length % 2 !== 0 || tryPairPool(pool, existingMatches) === null) &&
      j < sortedPlayers.length
    ) {
      pool.push(sortedPlayers[j]);
      j += 1;
      if (pool.length % 2 === 0 && tryPairPool(pool, existingMatches) !== null) break;
    }

    const paired = tryPairPool(pool, existingMatches);
    if (paired) {
      pairs.push(...paired);
      i = j;
      continue;
    }

    // Still stuck (usually end of list): take every rematch-free pair, bye the rest
    const { pairs: greedy, unpaired } = greedyRematchFree(pool, existingMatches);
    pairs.push(...greedy);
    for (const p of unpaired) {
      pairs.push({
        player_a_id: p.user_id,
        player_b_id: p.user_id,
        is_bye: true,
      });
    }
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
  const structuralByes = [];
  let pool = sorted;

  if (pool.length % 2 === 1) {
    const byePlayer = chooseByePlayer(pool, existingMatches);
    if (byePlayer) {
      structuralByes.push({
        player_a_id: byePlayer.user_id,
        player_b_id: byePlayer.user_id,
        is_bye: true,
      });
      pool = pool.filter((p) => p.user_id !== byePlayer.user_id);
    }
  }

  let pairs = [];
  if (pool.length >= 2) {
    const ranked = sortByScoreAndElo(pool);
    // Prefer score-group floats; if that leaves rematch-stuck byes while a
    // full-field rematch-free matching exists, use the global matching.
    const floated = pairWithFloats(ranked, existingMatches);
    const extraByes = floated.filter((p) => p.is_bye);
    const global = tryPairPool(ranked, existingMatches);
    if (extraByes.length > 0 && global) {
      pairs = global;
    } else {
      pairs = floated;
    }
  }

  const combined = [...structuralByes, ...pairs];

  // Absolute safety: never emit a rematch game — convert any slip to byes
  const safe = [];
  const rematchVictims = [];
  for (const p of combined) {
    if (p.is_bye) {
      safe.push(p);
      continue;
    }
    if (hasPlayedBefore(existingMatches, p.player_a_id, p.player_b_id)) {
      rematchVictims.push(p.player_a_id, p.player_b_id);
      continue;
    }
    safe.push(p);
  }
  for (const uid of [...new Set(rematchVictims)]) {
    const alreadyCovered = safe.some(
      (p) =>
        (p.is_bye && p.player_a_id === uid) ||
        (!p.is_bye && (p.player_a_id === uid || p.player_b_id === uid))
    );
    if (!alreadyCovered) {
      safe.push({ player_a_id: uid, player_b_id: uid, is_bye: true });
    }
  }

  return safe;
}

module.exports = {
  generateSwissPairings,
  chooseByePlayer,
  tryPairPool,
};
