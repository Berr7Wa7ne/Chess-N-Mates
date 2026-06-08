/**
 * Tournament fixture generation for Swiss, Knockout, and Round Robin formats.
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

function generateKnockoutPairings(participants, roundNumber, completedMatches) {
  const active = sortByScoreAndElo(
    participants.filter((p) => p.participant_status === 'active' || p.participant_status === 'registered')
  );

  if (roundNumber === 1) {
    const seeded = sortByScoreAndElo(active);
    const pairs = [];
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

    if (left === right) {
      pairs.push({
        player_a_id: seeded[left].user_id,
        player_b_id: null,
        is_bye: true,
      });
    }

    return pairs;
  }

  const roundMatches = completedMatches.filter((m) => m.round_number === roundNumber - 1);
  const winners = [];

  for (const match of roundMatches) {
    if (match.result_winner === 'a') winners.push(match.player_a_id);
    else if (match.result_winner === 'b') winners.push(match.player_b_id);
    else if (match.is_bye || !match.player_b_id) winners.push(match.player_a_id);
  }

  const pairs = [];
  for (let i = 0; i < winners.length; i += 2) {
    if (i + 1 < winners.length) {
      pairs.push({ player_a_id: winners[i], player_b_id: winners[i + 1] });
    } else {
      pairs.push({ player_a_id: winners[i], player_b_id: null, is_bye: true });
    }
  }

  return pairs;
}

function generateRoundRobinPairings(participants, roundNumber) {
  const active = sortByScoreAndElo(
    participants.filter((p) => ['registered', 'active'].includes(p.participant_status))
  );

  const allPairings = [];
  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      allPairings.push({
        player_a_id: active[i].user_id,
        player_b_id: active[j].user_id,
      });
    }
  }

  const perRound = Math.max(1, Math.ceil(allPairings.length / Math.max(active.length - 1, 1)));
  const start = (roundNumber - 1) * perRound;
  return allPairings.slice(start, start + perRound);
}

function generateRoundRobinAllRounds(participants, totalRounds) {
  const fixtures = [];
  for (let round = 1; round <= totalRounds; round += 1) {
    const pairings = generateRoundRobinPairings(participants, round);
    for (const pair of pairings) {
      fixtures.push({ ...pair, round_number: round });
    }
  }
  return fixtures;
}

function generateFixtures(competition, participants, existingMatches, completedMatches, roundNumber) {
  const { tournament_type } = competition;

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
    if (roundNumber === 1) {
      return generateRoundRobinAllRounds(participants, competition.rounds || 1);
    }
    return [];
  }

  return [];
}

module.exports = {
  generateFixtures,
  generateSwissPairings,
  generateKnockoutPairings,
  generateRoundRobinPairings,
};
