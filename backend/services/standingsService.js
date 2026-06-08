/**
 * Standings / ranking calculation.
 * Order: score → head-to-head → Buchholz → ELO
 */

function getMatchPoints(resultWinner, playerId, match) {
  if (match.match_status !== 'completed') return null;
  if (resultWinner === 'draw') return 0.5;
  if (resultWinner === 'a' && match.player_a_id === playerId) return 1;
  if (resultWinner === 'b' && match.player_b_id === playerId) return 1;
  if (resultWinner === 'a' || resultWinner === 'b') return 0;
  return null;
}

function headToHeadScore(playerA, playerB, matches) {
  for (const match of matches) {
    const involvesBoth =
      (match.player_a_id === playerA && match.player_b_id === playerB) ||
      (match.player_a_id === playerB && match.player_b_id === playerA);

    if (!involvesBoth || match.match_status !== 'completed') continue;

    const ptsA = getMatchPoints(match.result_winner, playerA, match);
    const ptsB = getMatchPoints(match.result_winner, playerB, match);
    return ptsA - ptsB;
  }
  return 0;
}

function computeBuchholz(userId, matches, participantScores) {
  const opponents = new Set();

  for (const match of matches) {
    if (match.match_status !== 'completed') continue;
    if (match.player_a_id === userId) opponents.add(match.player_b_id);
    if (match.player_b_id === userId) opponents.add(match.player_a_id);
  }

  let total = 0;
  for (const oppId of opponents) {
    total += participantScores.get(oppId) ?? 0;
  }
  return total;
}

function computeStandings(participants, matches) {
  const eligible = participants.filter((p) =>
    ['registered', 'active', 'eliminated'].includes(p.participant_status)
  );

  const participantScores = new Map(
    eligible.map((p) => [p.user_id, Number(p.score ?? 0)])
  );

  const rows = eligible.map((p) => {
    const user = p.users || {};
    return {
      user_id: p.user_id,
      display_name: user.display_name || `Player ${p.user_id}`,
      chess_username: user.chess_username || null,
      chess_elo: user.chess_elo ?? 1000,
      score: Number(p.score ?? 0),
      wins: p.wins ?? 0,
      draws: p.draws ?? 0,
      losses: p.losses ?? 0,
      buchholz: computeBuchholz(p.user_id, matches, participantScores),
    };
  });

  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;

    const h2h = headToHeadScore(a.user_id, b.user_id, matches);
    if (h2h !== 0) return -h2h;

    if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;

    return (b.chess_elo || 0) - (a.chess_elo || 0);
  });

  return rows.map((row, index) => ({
    rank: index + 1,
    user_id: row.user_id,
    display_name: row.display_name,
    chess_username: row.chess_username,
    chess_elo: row.chess_elo,
    score: row.score,
    wins: row.wins,
    draws: row.draws,
    losses: row.losses,
  }));
}

module.exports = { computeStandings };
