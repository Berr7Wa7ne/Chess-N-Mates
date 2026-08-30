/**
 * Shared scoring helpers for tournament engines.
 * Club points system: Win = 2, Draw = 1, Loss = 0, Bye = 2.
 */

const POINTS = {
  WIN: 2,
  DRAW: 1,
  LOSS: 0,
  BYE: 2,
};

function isActiveParticipant(p) {
  return ['registered', 'active'].includes(p.participant_status);
}

function sortByScoreAndElo(participants) {
  return [...participants].sort((a, b) => {
    const scoreDiff = Number(b.score ?? 0) - Number(a.score ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return (b.chess_elo || 0) - (a.chess_elo || 0);
  });
}

function hasPlayedBefore(matches, playerA, playerB) {
  return (matches || []).some(
    (m) =>
      !m.is_bye &&
      ((m.player_a_id === playerA && m.player_b_id === playerB) ||
        (m.player_a_id === playerB && m.player_b_id === playerA))
  );
}

/** Color balance: +1 white (player_a), -1 black (player_b). Positive = more whites. */
function getColorBalance(playerId, matches) {
  let balance = 0;
  for (const m of matches || []) {
    if (m.is_bye || m.match_status !== 'completed') continue;
    if (m.player_a_id === playerId) balance += 1;
    if (m.player_b_id === playerId) balance -= 1;
  }
  return balance;
}

function countByes(playerId, matches) {
  return (matches || []).filter(
    (m) => m.is_bye && m.player_a_id === playerId && m.match_status === 'completed'
  ).length;
}

/**
 * Recompute live scores from completed matches so pairing/standings
 * stay consistent even when DB participant.score lags (e.g. byes).
 */
function computeLiveScores(participants, matches) {
  const scores = new Map();
  for (const p of participants) {
    scores.set(p.user_id, 0);
  }

  for (const match of matches || []) {
    if (match.match_status !== 'completed') continue;

    if (match.is_bye) {
      if (scores.has(match.player_a_id)) {
        scores.set(match.player_a_id, scores.get(match.player_a_id) + POINTS.BYE);
      }
      continue;
    }

    if (match.is_absent) {
      if (match.absence_side === 'a' && scores.has(match.player_b_id)) {
        scores.set(match.player_b_id, scores.get(match.player_b_id) + POINTS.WIN);
      } else if (match.absence_side === 'b' && scores.has(match.player_a_id)) {
        scores.set(match.player_a_id, scores.get(match.player_a_id) + POINTS.WIN);
      }
      continue;
    }

    if (match.result_winner === 'a') {
      if (scores.has(match.player_a_id)) {
        scores.set(match.player_a_id, scores.get(match.player_a_id) + POINTS.WIN);
      }
    } else if (match.result_winner === 'b') {
      if (scores.has(match.player_b_id)) {
        scores.set(match.player_b_id, scores.get(match.player_b_id) + POINTS.WIN);
      }
    } else if (match.result_winner === 'draw') {
      if (scores.has(match.player_a_id)) {
        scores.set(match.player_a_id, scores.get(match.player_a_id) + POINTS.DRAW);
      }
      if (scores.has(match.player_b_id)) {
        scores.set(match.player_b_id, scores.get(match.player_b_id) + POINTS.DRAW);
      }
    }
  }

  return scores;
}

function withLiveScores(participants, matches) {
  const live = computeLiveScores(participants, matches);
  return participants.map((p) => ({
    ...p,
    score: live.has(p.user_id) ? live.get(p.user_id) : Number(p.score ?? 0),
  }));
}

/**
 * Assign colors for a pairing: prefer white for the player who has had fewer whites.
 * Returns { player_a_id, player_b_id } where a = white.
 */
function assignColors(id1, id2, matches) {
  const bal1 = getColorBalance(id1, matches);
  const bal2 = getColorBalance(id2, matches);
  // Lower balance (fewer whites / more blacks) should get white
  if (bal1 < bal2) return { player_a_id: id1, player_b_id: id2 };
  if (bal2 < bal1) return { player_a_id: id2, player_b_id: id1 };
  // Tie: higher-rated / first id as white for stability — caller passes preferred seed first
  return { player_a_id: id1, player_b_id: id2 };
}

module.exports = {
  POINTS,
  isActiveParticipant,
  sortByScoreAndElo,
  hasPlayedBefore,
  getColorBalance,
  countByes,
  computeLiveScores,
  withLiveScores,
  assignColors,
};
