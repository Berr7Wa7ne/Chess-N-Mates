/**
 * Standings / ranking calculation for Round Robin Single Game.
 * 
 * Points System: Win = 2, Draw = 1, Loss = 0, Absent = 0
 * 
 * Ranking Hierarchy (strict order):
 *   1. Most Points
 *   2. Most Wins
 *   3. Fewest Losses
 *   4. Fewest Absences
 *   5. Special: 0 points with losses > 0 points with absences
 *   6. Head-to-head result
 *   7. Alphabetical
 * 
 * Key Rules:
 *   - BYE does NOT count as played, loss, absence, or points
 *   - Absence is tracked separately from losses
 *   - Pending/ongoing matches do NOT affect standings
 *   - When a player is absent, opponent gets an automatic win (+2 pts)
 */

function computeStandings(participants, matches) {
  const eligible = participants.filter((p) =>
    ['registered', 'active', 'eliminated'].includes(p.participant_status)
  );

  // Build stats for each player
  const statsMap = new Map();

  for (const p of eligible) {
    const user = p.users || {};
    statsMap.set(p.user_id, {
      user_id: p.user_id,
      display_name: user.display_name || `Player ${p.user_id}`,
      chess_username: user.chess_username || null,
      chess_elo: user.chess_elo ?? 1000,
      // Core stats
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      absences: Number(p.absences ?? 0),
      byes: Number(p.byes ?? 0),
    });
  }

  // Process completed matches only
  const completedMatches = (matches || []).filter(
    (m) => m.match_status === 'completed'
  );

  for (const match of completedMatches) {
    if (match.is_bye) {
      // BYE round — award 2 points to the resting player
      const player = statsMap.get(match.player_a_id);
      if (player) {
        player.byes += 1;
        player.points += 2;
      }
      continue;
    }

    const playerA = statsMap.get(match.player_a_id);
    const playerB = statsMap.get(match.player_b_id);
    if (!playerA || !playerB) continue;

    // Absence handling
    if (match.is_absent) {
      if (match.absence_side === 'both') {
        // Both players absent — each gets 0 points, absences incremented
        playerA.absences += 1;
        playerB.absences += 1;
      } else if (match.absence_side === 'a') {
        // Player A was absent - B gets auto win
        playerB.played += 1;
        playerB.wins += 1;
        playerB.points += 2;
        playerA.absences += 1;
      } else if (match.absence_side === 'b') {
        // Player B was absent - A gets auto win
        playerA.played += 1;
        playerA.wins += 1;
        playerA.points += 2;
        playerB.absences += 1;
      }
      continue;
    }

    // Normal result
    playerA.played += 1;
    playerB.played += 1;

    if (match.result_winner === 'a') {
      playerA.wins += 1;
      playerA.points += 2;
      playerB.losses += 1;
    } else if (match.result_winner === 'b') {
      playerB.wins += 1;
      playerB.points += 2;
      playerA.losses += 1;
    } else if (match.result_winner === 'draw') {
      playerA.draws += 1;
      playerA.points += 1;
      playerB.draws += 1;
      playerB.points += 1;
    }
  }

  // Convert map to array and sort
  const rows = Array.from(statsMap.values());

  rows.sort((a, b) => {
    // 1. Most Points
    if (b.points !== a.points) return b.points - a.points;

    // 2. Most Wins
    if (b.wins !== a.wins) return b.wins - a.wins;

    // 3. Fewest Losses
    if (a.losses !== b.losses) return a.losses - b.losses;

    // 4. Fewest Absences
    if (a.absences !== b.absences) return a.absences - b.absences;

    // 5. Special: 0 points with losses ranks above 0 points with absences
    if (a.points === 0 && b.points === 0) {
      const hasLossesA = a.losses > 0 ? 1 : 0;
      const hasLossesB = b.losses > 0 ? 1 : 0;
      if (hasLossesA !== hasLossesB) return hasLossesB - hasLossesA;
    }

    // 6. Head-to-head result
    const h2h = headToHeadScore(a.user_id, b.user_id, completedMatches);
    if (h2h !== 0) return h2h;

    // 7. Alphabetical
    return (a.display_name || '').localeCompare(b.display_name || '');
  });

  // Assign ranks with tie indicators
  return rows.map((row, index) => {
    // Check if tied with previous player
    const prev = index > 0 ? rows[index - 1] : null;
    let rankDisplay = String(index + 1);
    
    if (prev && areTied(prev, row, completedMatches)) {
      // Share rank with previous
      rankDisplay = `T-${index}`; // Will be adjusted
    }

    return {
      rank: index + 1,
      rank_display: rankDisplay,
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
    };
  });
}

function areTied(a, b, completedMatches) {
  if (a.points !== b.points) return false;
  if (a.wins !== b.wins) return false;
  if (a.losses !== b.losses) return false;
  if (a.absences !== b.absences) return false;
  
  // Check 0-point special rule
  if (a.points === 0 && b.points === 0) {
    const hasLossesA = a.losses > 0 ? 1 : 0;
    const hasLossesB = b.losses > 0 ? 1 : 0;
    if (hasLossesA !== hasLossesB) return false;
  }
  
  // Check head-to-head
  const h2h = headToHeadScore(a.user_id, b.user_id, completedMatches);
  if (h2h !== 0) return false;
  
  return true;
}

function headToHeadScore(playerA, playerB, completedMatches) {
  let aScore = 0;
  let bScore = 0;
  let hasMatch = false;

  for (const match of completedMatches) {
    if (match.is_bye || match.is_absent) continue;

    const aIsPlayerA = match.player_a_id === playerA;
    const bIsPlayerB = match.player_b_id === playerB;
    const aIsPlayerB = match.player_a_id === playerB;
    const bIsPlayerA = match.player_b_id === playerA;

    const involvesBoth = (aIsPlayerA && bIsPlayerB) || (aIsPlayerB && bIsPlayerA);
    if (!involvesBoth) continue;

    hasMatch = true;

    // Aggregate 2-1-0 scoring across both legs
    if (match.result_winner === 'a') {
      if (aIsPlayerA || bIsPlayerA) {
        // PlayerA won this match (regardless of which side they played)
        aScore += 2;
      } else {
        bScore += 2;
      }
    } else if (match.result_winner === 'b') {
      if (aIsPlayerB || bIsPlayerB) {
        // PlayerB won this match
        bScore += 2;
      } else {
        aScore += 2;
      }
    } else if (match.result_winner === 'draw') {
      aScore += 1;
      bScore += 1;
    }
  }

  if (!hasMatch) return 0;
  // Return positive if playerA leads, negative if playerB leads
  return bScore - aScore;
}

module.exports = { computeStandings };