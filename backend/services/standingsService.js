/**
 * Format-aware standings and tiebreaks.
 *
 * Points: Win = 2, Draw = 1, Loss = 0, Bye = 2 (club system).
 *
 * Ranking by format:
 *   Swiss:
 *     1. Points
 *     2. Buchholz (sum of opponents' points)
 *     3. Buchholz Cut-1 (drop lowest opponent)
 *     4. Sonneborn-Berger
 *     5. Wins
 *     6. Head-to-head
 *     7. ELO
 *     8. Alphabetical
 *
 *   Round Robin / Double RR:
 *     1. Points
 *     2. Wins
 *     3. Fewest losses
 *     4. Fewest absences
 *     5. Head-to-head
 *     6. Sonneborn-Berger
 *     7. Alphabetical
 *
 *   Knockout:
 *     Rank by elimination round (further = better), then points/wins, then ELO.
 */

function buildBaseStats(participants) {
  const statsMap = new Map();

  for (const p of participants) {
    if (!['registered', 'active', 'eliminated'].includes(p.participant_status)) continue;
    const user = p.users || {};
    statsMap.set(p.user_id, {
      user_id: p.user_id,
      display_name:
        user.display_name || user.chess_com_username || user.chess_username || `Player ${p.user_id}`,
      chess_username: user.chess_com_username || user.chess_username || null,
      chess_elo: user.chess_elo ?? 1000,
      participant_status: p.participant_status,
      eliminated_at: p.eliminated_at || null,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      absences: 0,
      byes: 0,
      opponents: [], // { id, resultPointsForSB, opponentWasAbsent }
      knockout_round_reached: 0,
    });
  }

  return statsMap;
}

function applyMatches(statsMap, matches) {
  const completedMatches = (matches || []).filter((m) => m.match_status === 'completed');

  for (const match of completedMatches) {
    if (match.is_bye) {
      const player = statsMap.get(match.player_a_id);
      if (player) {
        player.byes += 1;
        player.points += 2;
        player.knockout_round_reached = Math.max(
          player.knockout_round_reached,
          Number(match.round_number) || 0
        );
      }
      continue;
    }

    const playerA = statsMap.get(match.player_a_id);
    const playerB = statsMap.get(match.player_b_id);
    if (!playerA || !playerB) continue;

    const round = Number(match.round_number) || 0;

    if (match.is_absent) {
      if (match.absence_side === 'both') {
        playerA.absences += 1;
        playerB.absences += 1;
      } else if (match.absence_side === 'a') {
        playerB.played += 1;
        playerB.wins += 1;
        playerB.points += 2;
        playerA.absences += 1;
        playerB.opponents.push({ id: playerA.user_id, sb: 2 });
        playerA.opponents.push({ id: playerB.user_id, sb: 0 });
        playerB.knockout_round_reached = Math.max(playerB.knockout_round_reached, round);
        playerA.knockout_round_reached = Math.max(playerA.knockout_round_reached, round);
      } else if (match.absence_side === 'b') {
        playerA.played += 1;
        playerA.wins += 1;
        playerA.points += 2;
        playerB.absences += 1;
        playerA.opponents.push({ id: playerB.user_id, sb: 2 });
        playerB.opponents.push({ id: playerA.user_id, sb: 0 });
        playerA.knockout_round_reached = Math.max(playerA.knockout_round_reached, round);
        playerB.knockout_round_reached = Math.max(playerB.knockout_round_reached, round);
      }
      continue;
    }

    playerA.played += 1;
    playerB.played += 1;
    playerA.knockout_round_reached = Math.max(playerA.knockout_round_reached, round);
    playerB.knockout_round_reached = Math.max(playerB.knockout_round_reached, round);

    if (match.result_winner === 'a') {
      playerA.wins += 1;
      playerA.points += 2;
      playerB.losses += 1;
      playerA.opponents.push({ id: playerB.user_id, sb: 2 });
      playerB.opponents.push({ id: playerA.user_id, sb: 0 });
    } else if (match.result_winner === 'b') {
      playerB.wins += 1;
      playerB.points += 2;
      playerA.losses += 1;
      playerB.opponents.push({ id: playerA.user_id, sb: 2 });
      playerA.opponents.push({ id: playerB.user_id, sb: 0 });
    } else if (match.result_winner === 'draw') {
      playerA.draws += 1;
      playerA.points += 1;
      playerB.draws += 1;
      playerB.points += 1;
      playerA.opponents.push({ id: playerB.user_id, sb: 1 });
      playerB.opponents.push({ id: playerA.user_id, sb: 1 });
    }
  }

  return completedMatches;
}

function attachTiebreaks(statsMap) {
  for (const row of statsMap.values()) {
    const oppPoints = row.opponents.map((o) => {
      const opp = statsMap.get(o.id);
      return opp ? opp.points : 0;
    });

    row.buchholz = oppPoints.reduce((s, v) => s + v, 0);

    if (oppPoints.length <= 1) {
      row.buchholz_cut1 = row.buchholz;
    } else {
      const min = Math.min(...oppPoints);
      row.buchholz_cut1 = row.buchholz - min;
    }

    // Sonneborn-Berger: sum of defeated opponents' scores + half of drawn opponents' scores
    // Using sb weight already encoded (2=win, 1=draw, 0=loss) → SB = sum(weight/2 * oppPoints)
    row.sonneborn_berger = row.opponents.reduce((sum, o) => {
      const opp = statsMap.get(o.id);
      const oppPts = opp ? opp.points : 0;
      return sum + (o.sb / 2) * oppPts;
    }, 0);
  }
}

function headToHeadScore(playerA, playerB, completedMatches) {
  let aScore = 0;
  let bScore = 0;
  let hasMatch = false;

  for (const match of completedMatches) {
    if (match.is_bye || match.is_absent) continue;

    const involves =
      (match.player_a_id === playerA && match.player_b_id === playerB) ||
      (match.player_a_id === playerB && match.player_b_id === playerA);
    if (!involves) continue;

    hasMatch = true;
    const aIsA = match.player_a_id === playerA;

    if (match.result_winner === 'a') {
      if (aIsA) aScore += 2;
      else bScore += 2;
    } else if (match.result_winner === 'b') {
      if (aIsA) bScore += 2;
      else aScore += 2;
    } else if (match.result_winner === 'draw') {
      aScore += 1;
      bScore += 1;
    }
  }

  if (!hasMatch) return 0;
  return bScore - aScore; // positive ⇒ playerA ranks worse (b ahead)
}

function compareSwiss(a, b, completedMatches) {
  if (b.points !== a.points) return b.points - a.points;
  if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
  if (b.buchholz_cut1 !== a.buchholz_cut1) return b.buchholz_cut1 - a.buchholz_cut1;
  if (b.sonneborn_berger !== a.sonneborn_berger) return b.sonneborn_berger - a.sonneborn_berger;
  if (b.wins !== a.wins) return b.wins - a.wins;
  const h2h = headToHeadScore(a.user_id, b.user_id, completedMatches);
  if (h2h !== 0) return h2h;
  if ((b.chess_elo || 0) !== (a.chess_elo || 0)) return (b.chess_elo || 0) - (a.chess_elo || 0);
  return (a.display_name || '').localeCompare(b.display_name || '');
}

function compareRoundRobin(a, b, completedMatches) {
  if (b.points !== a.points) return b.points - a.points;
  if (b.wins !== a.wins) return b.wins - a.wins;
  if (a.losses !== b.losses) return a.losses - b.losses;
  if (a.absences !== b.absences) return a.absences - b.absences;

  if (a.points === 0 && b.points === 0) {
    const hasLossesA = a.losses > 0 ? 1 : 0;
    const hasLossesB = b.losses > 0 ? 1 : 0;
    if (hasLossesA !== hasLossesB) return hasLossesB - hasLossesA;
  }

  const h2h = headToHeadScore(a.user_id, b.user_id, completedMatches);
  if (h2h !== 0) return h2h;
  if (b.sonneborn_berger !== a.sonneborn_berger) return b.sonneborn_berger - a.sonneborn_berger;
  return (a.display_name || '').localeCompare(b.display_name || '');
}

function compareKnockout(a, b, completedMatches) {
  // Further in the bracket = higher rank
  if (b.knockout_round_reached !== a.knockout_round_reached) {
    return b.knockout_round_reached - a.knockout_round_reached;
  }
  // Still active beats eliminated at same round
  const aActive = a.participant_status === 'eliminated' ? 0 : 1;
  const bActive = b.participant_status === 'eliminated' ? 0 : 1;
  if (bActive !== aActive) return bActive - aActive;

  if (b.points !== a.points) return b.points - a.points;
  if (b.wins !== a.wins) return b.wins - a.wins;
  const h2h = headToHeadScore(a.user_id, b.user_id, completedMatches);
  if (h2h !== 0) return h2h;
  if ((b.chess_elo || 0) !== (a.chess_elo || 0)) return (b.chess_elo || 0) - (a.chess_elo || 0);
  return (a.display_name || '').localeCompare(b.display_name || '');
}

function areEqualByComparator(a, b, completedMatches, compareFn) {
  return compareFn(a, b, completedMatches) === 0;
}

/**
 * @param {Array} participants
 * @param {Array} matches
 * @param {{ tournamentType?: string }} [options]
 */
function computeStandings(participants, matches, options = {}) {
  const tournamentType = options.tournamentType || 'round_robin';
  const statsMap = buildBaseStats(participants);
  const completedMatches = applyMatches(statsMap, matches);
  attachTiebreaks(statsMap);

  const rows = Array.from(statsMap.values());

  const compareFn =
    tournamentType === 'swiss'
      ? compareSwiss
      : tournamentType === 'knockout'
        ? compareKnockout
        : compareRoundRobin;

  rows.sort((a, b) => compareFn(a, b, completedMatches));

  return rows.map((row, index) => {
    const prev = index > 0 ? rows[index - 1] : null;
    const tied =
      prev && areEqualByComparator(prev, row, completedMatches, compareFn);

    return {
      rank: index + 1,
      rank_display: tied ? `T-${index}` : String(index + 1),
      user_id: row.user_id,
      display_name: row.display_name,
      chess_username: row.chess_username,
      chess_elo: row.chess_elo,
      played: row.played,
      wins: row.wins,
      draws: row.draws,
      losses: row.losses,
      points: row.points,
      absences: row.absences,
      byes: row.byes,
      buchholz: Number(row.buchholz.toFixed(1)),
      buchholz_cut1: Number(row.buchholz_cut1.toFixed(1)),
      sonneborn_berger: Number(row.sonneborn_berger.toFixed(1)),
      knockout_round_reached: row.knockout_round_reached,
      participant_status: row.participant_status,
    };
  });
}

module.exports = {
  computeStandings,
  headToHeadScore,
  compareSwiss,
  compareRoundRobin,
  compareKnockout,
};
