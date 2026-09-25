/**
 * Match & tournament win odds from Chess.com Elo + in-tournament head-to-head.
 *
 * Match model:
 *   - Base expected score from Elo (standard 400-scale logistic)
 *   - Draw share scaled by rating gap (closer ratings → more draws)
 *   - Blend with empirical H2H when the pair has already played in this competition
 *
 * Tournament win %:
 *   Monte Carlo over remaining incomplete fixtures, then format-aware standings.
 *   For Swiss rounds not yet paired, remaining rounds are resimulated with
 *   score-aware Swiss pairing + Elo/H2H (recomputed on every standings fetch).
 *
 * Ratings: prefer live Chess.com ratings (hydrated via hydrateChessComRatings),
 * not the in-app users.chess_elo field.
 */

const { computeStandings } = require('./standingsService');
const {
  resolveChessComUsername,
  fetchPlayerRatings,
  ratingForTimeControl,
} = require('./chessComService');

const DEFAULT_ELO = 1000;
const H2H_BLEND_MAX = 0.55; // max weight on H2H when many games exist
const MONTE_CARLO_SIMS = 2500;
const DRAW_BASE = 0.28;
const DRAW_DECAY_PER_ELO = 0.00045;

/**
 * Resolve rating for odds. Prefers Chess.com fields set by hydrateChessComRatings.
 * Falls back to chess_elo only when no chess_com_* field is present (unit tests /
 * offline). Once hydrated with chess_com_rating: null, uses DEFAULT_ELO instead
 * of in-app Elo so odds never treat placeholder club ratings as real.
 */
function eloOf(playerLike) {
  if (!playerLike) return DEFAULT_ELO;
  if (Object.prototype.hasOwnProperty.call(playerLike, 'chess_com_rating')) {
    const v = Number(playerLike.chess_com_rating);
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_ELO;
  }
  const com =
    playerLike.chess_com_rapid ??
    playerLike.chess_rapid ??
    playerLike.ratings?.rapid ??
    playerLike.ratings?.blitz;
  if (com != null && Number.isFinite(Number(com)) && Number(com) > 0) {
    return Number(com);
  }
  const v = playerLike.chess_elo ?? playerLike.elo;
  return Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : DEFAULT_ELO;
}

/**
 * Attach chess_com_rating onto player-like objects (match.player_a/b or participants).
 * Mutates in place for efficiency; returns the same references.
 * Also write-backs to users.chess_elo when we know the user id, so live
 * odds stay correct even if an older API process only reads chess_elo.
 */
async function hydrateChessComRatings(playerLikes, timeControl, options = {}) {
  const list = (playerLikes || []).filter(Boolean);
  if (list.length === 0) return list;

  const usernameByIndex = list.map((p) =>
    resolveChessComUsername(p.users || p)
  );
  const unique = [...new Set(usernameByIndex.filter(Boolean))];
  const ratingByUser = new Map();

  await Promise.all(
    unique.map(async (username) => {
      const ratings = await fetchPlayerRatings(username);
      ratingByUser.set(username.toLowerCase(), ratingForTimeControl(ratings, timeControl));
    })
  );

  const writeBack = options.writeBack !== false;
  const pendingWrites = new Map(); // userId → rating

  for (let i = 0; i < list.length; i++) {
    const username = usernameByIndex[i];
    const rating = username ? ratingByUser.get(username.toLowerCase()) ?? null : null;
    list[i].chess_com_rating = rating;
    if (rating != null) {
      list[i].chess_elo = rating;
    }
    // Keep nested users in sync for participant-shaped objects
    if (list[i].users && typeof list[i].users === 'object') {
      list[i].users.chess_com_rating = rating;
      if (rating != null) list[i].users.chess_elo = rating;
    }

    if (writeBack && rating != null) {
      const uid = list[i].id || list[i].user_id || list[i].users?.id;
      if (uid) pendingWrites.set(uid, rating);
    }
  }

  if (writeBack && pendingWrites.size > 0) {
    try {
      const { supabaseAdmin } = require('../config/supabase');
      await Promise.all(
        [...pendingWrites.entries()].map(([id, chess_elo]) =>
          supabaseAdmin.from('users').update({ chess_elo }).eq('id', id)
        )
      );
    } catch (err) {
      console.warn('[odds] chess_elo write-back skipped:', err.message);
    }
  }

  return list;
}

/**
 * Hydrate ratings on match player_a/player_b and optional participant list.
 */
async function hydrateOddsEntities({ matches, participants, timeControl } = {}) {
  const players = [];
  for (const m of matches || []) {
    if (m.player_a) players.push(m.player_a);
    if (m.player_b) players.push(m.player_b);
  }
  for (const p of participants || []) {
    players.push(p);
    if (p.users) players.push(p.users);
  }
  await hydrateChessComRatings(players, timeControl);
}

/** Expected score for A vs B (includes draws as half-points conceptually). */
function eloExpectedScore(eloA, eloB) {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

function drawProbability(eloA, eloB) {
  const gap = Math.abs(eloA - eloB);
  return Math.max(0.08, Math.min(0.4, DRAW_BASE - gap * DRAW_DECAY_PER_ELO));
}

/**
 * Build W-D-L H2H for an ordered pair within one competition's matches.
 * playerA / playerB are user ids; results are from A's perspective.
 */
function computeHeadToHead(playerAId, playerBId, matches) {
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let pointsFor = 0;
  let pointsAgainst = 0;
  const games = [];

  for (const match of matches || []) {
    if (match.is_bye || match.is_absent) continue;
    if (match.match_status !== 'completed') continue;

    const involves =
      (match.player_a_id === playerAId && match.player_b_id === playerBId) ||
      (match.player_a_id === playerBId && match.player_b_id === playerAId);
    if (!involves) continue;

    const aIsA = match.player_a_id === playerAId;
    let outcome; // 'win' | 'draw' | 'loss' from playerA perspective

    if (match.result_winner === 'draw') {
      outcome = 'draw';
      draws += 1;
      pointsFor += 1;
      pointsAgainst += 1;
    } else if (match.result_winner === 'both') {
      // Mutual win: counts as a played game; competitively neutral for odds blend
      outcome = 'draw';
      draws += 1;
      pointsFor += 2;
      pointsAgainst += 2;
    } else if (match.result_winner === 'a') {
      if (aIsA) {
        outcome = 'win';
        wins += 1;
        pointsFor += 2;
      } else {
        outcome = 'loss';
        losses += 1;
        pointsAgainst += 2;
      }
    } else if (match.result_winner === 'b') {
      if (aIsA) {
        outcome = 'loss';
        losses += 1;
        pointsAgainst += 2;
      } else {
        outcome = 'win';
        wins += 1;
        pointsFor += 2;
      }
    } else {
      continue;
    }

    games.push({
      match_id: match.id,
      round_number: match.round_number,
      leg: match.leg,
      outcome,
      result_winner: match.result_winner,
    });
  }

  return {
    player_a_id: playerAId,
    player_b_id: playerBId,
    played: wins + draws + losses,
    wins,
    draws,
    losses,
    points_for: pointsFor,
    points_against: pointsAgainst,
    games,
  };
}

/**
 * P(win A), P(draw), P(win B) summing to 1.
 */
function matchOutcomeProbabilities(eloA, eloB, h2h) {
  const expectedA = eloExpectedScore(eloA, eloB);
  const pDrawElo = drawProbability(eloA, eloB);
  const remaining = 1 - pDrawElo;
  let pWinA = remaining * expectedA;
  let pWinB = remaining * (1 - expectedA);
  let pDraw = pDrawElo;

  const played = h2h?.played || 0;
  if (played > 0) {
    const h2hWin = h2h.wins / played;
    const h2hDraw = h2h.draws / played;
    const h2hLoss = h2h.losses / played;
    const weight = Math.min(H2H_BLEND_MAX, 0.18 + played * 0.12);
    pWinA = (1 - weight) * pWinA + weight * h2hWin;
    pDraw = (1 - weight) * pDraw + weight * h2hDraw;
    pWinB = (1 - weight) * pWinB + weight * h2hLoss;
  }

  const sum = pWinA + pDraw + pWinB;
  return {
    win_pct_a: pWinA / sum,
    draw_pct: pDraw / sum,
    win_pct_b: pWinB / sum,
  };
}

function formatPct(p) {
  return Math.round(p * 1000) / 10; // one decimal
}

function buildBanter({ nameA, nameB, probs, h2h, eloA, eloB }) {
  const pctA = formatPct(probs.win_pct_a);
  const pctB = formatPct(probs.win_pct_b);
  const favorite = probs.win_pct_a >= probs.win_pct_b ? 'a' : 'b';
  const favName = favorite === 'a' ? nameA : nameB;
  const favPct = favorite === 'a' ? pctA : pctB;
  const underdogPct = favorite === 'a' ? pctB : pctA;
  const eloGap = Math.abs(eloA - eloB);
  const parts = [];

  if (Math.abs(probs.win_pct_a - probs.win_pct_b) < 0.06) {
    parts.push(`Toss-up between ${nameA} and ${nameB}`);
  } else {
    parts.push(`${favName} favored (${favPct}% vs ${underdogPct}%)`);
  }

  if (eloGap >= 80) {
    const higher = eloA >= eloB ? nameA : nameB;
    parts.push(`${higher} holds the rating edge (${Math.round(eloGap)} Elo)`);
  } else if (eloGap < 30) {
    parts.push('ratings nearly level');
  }

  if (h2h?.played > 0) {
    parts.push(
      `H2H ${h2h.wins}-${h2h.losses}-${h2h.draws} (${nameA} W-L-D)`
    );
  } else {
    parts.push('no tournament H2H yet');
  }

  return parts.join(' · ');
}

/**
 * Enrich a single match with live win likelihood + banter.
 */
function computeMatchOdds(match, allCompetitionMatches) {
  if (!match || match.is_bye || !match.player_a_id || !match.player_b_id) {
    return null;
  }

  const eloA = eloOf(match.player_a) || eloOf({ chess_elo: match.player_a_elo });
  const eloB = eloOf(match.player_b) || eloOf({ chess_elo: match.player_b_elo });
  const h2h = computeHeadToHead(match.player_a_id, match.player_b_id, allCompetitionMatches);
  const probs = matchOutcomeProbabilities(eloA, eloB, h2h);

  const nameA =
    match.player_a?.display_name ||
    match.player_a?.chess_username ||
    'Player A';
  const nameB =
    match.player_b?.display_name ||
    match.player_b?.chess_username ||
    'Player B';

  return {
    win_pct_a: formatPct(probs.win_pct_a),
    draw_pct: formatPct(probs.draw_pct),
    win_pct_b: formatPct(probs.win_pct_b),
    favorite: probs.win_pct_a === probs.win_pct_b ? 'even' : probs.win_pct_a > probs.win_pct_b ? 'a' : 'b',
    banter: buildBanter({ nameA, nameB, probs, h2h, eloA, eloB }),
    h2h: {
      played: h2h.played,
      wins_a: h2h.wins,
      draws: h2h.draws,
      losses_a: h2h.losses,
      points_a: h2h.points_for,
      points_b: h2h.points_against,
    },
    model: {
      elo_a: eloA,
      elo_b: eloB,
      sources: h2h.played > 0 ? ['elo', 'h2h'] : ['elo'],
    },
  };
}

function enrichMatchesWithOdds(matches, allCompetitionMatches) {
  const pool = allCompetitionMatches || matches;
  return (matches || []).map((m) => {
    if (m.is_bye || !m.player_b_id) return m;
    const odds = computeMatchOdds(m, pool);
    if (!odds) return m;
    return { ...m, odds };
  });
}

function pickOutcome(probs, rng) {
  const r = rng();
  if (r < probs.win_pct_a) return 'a';
  if (r < probs.win_pct_a + probs.draw_pct) return 'draw';
  return 'b';
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rng() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function eloByParticipantId(participants) {
  const map = new Map();
  for (const p of participants || []) {
    map.set(p.user_id, eloOf(p.users || p));
  }
  return map;
}

/**
 * How many Swiss rounds still need pairing beyond the known fixture list.
 * Known incomplete matches (current round) are simulated separately.
 */
function unpairedSwissRoundsAhead(competition, matches) {
  const totalRounds = Number(competition.rounds) || 0;
  if (totalRounds <= 0) return 0;
  let maxRoundWithFixtures = 0;
  for (const m of matches || []) {
    const r = Number(m.round_number) || 0;
    if (r > maxRoundWithFixtures) maxRoundWithFixtures = r;
  }
  // Prefer explicit current_round when fixtures lag; never go below max fixture round
  const current = Math.max(
    Number(competition.current_round) || 0,
    maxRoundWithFixtures
  );
  return Math.max(0, totalRounds - current);
}

/**
 * Fast score-aware Swiss pairing for MC soft rounds (top-vs-bottom within
 * the remaining pool, rematch avoidance). Not identical to the live pairer
 * but preserves the key property: leaders meet leaders.
 */
function softPairScoreGroups(sortedPlayers, history) {
  const { hasPlayedBefore } = require('./tournament/scoring');
  const remaining = [...sortedPlayers];
  const pairs = [];

  while (remaining.length >= 2) {
    const a = remaining.shift();
    let oppIdx = -1;
    // Prefer opponent from the lower half of what's left (classic Swiss feel)
    const halfStart = Math.floor(remaining.length / 2);
    for (let i = remaining.length - 1; i >= halfStart; i--) {
      if (!hasPlayedBefore(history, a.user_id, remaining[i].user_id)) {
        oppIdx = i;
        break;
      }
    }
    if (oppIdx < 0) {
      for (let i = remaining.length - 1; i >= 0; i--) {
        if (!hasPlayedBefore(history, a.user_id, remaining[i].user_id)) {
          oppIdx = i;
          break;
        }
      }
    }
    if (oppIdx < 0) oppIdx = remaining.length - 1;
    const b = remaining.splice(oppIdx, 1)[0];
    pairs.push({ player_a_id: a.user_id, player_b_id: b.user_id, is_bye: false });
  }

  if (remaining.length === 1) {
    pairs.push({
      player_a_id: remaining[0].user_id,
      player_b_id: remaining[0].user_id,
      is_bye: true,
    });
  }
  return pairs;
}

/**
 * Simulate unpaired future Swiss rounds inside one MC trial.
 * Score-group pairing so a player far behind cannot soft-luck the title
 * via random Elo pairings. Match probs include tournament H2H.
 */
function simulateFutureSwissRounds({
  participants,
  trialMatches,
  competition,
  eloMap,
  rng,
  futureRoundCount,
}) {
  if (futureRoundCount <= 0) return trialMatches;

  const { withLiveScores, isActiveParticipant, sortByScoreAndElo } = require('./tournament/scoring');

  let history = [...trialMatches];
  const startRound =
    Math.max(
      0,
      ...history.map((m) => Number(m.round_number) || 0),
      Number(competition.current_round) || 0
    ) + 1;

  for (let r = 0; r < futureRoundCount; r++) {
    const roundNumber = startRound + r;
    const scored = withLiveScores(
      (participants || []).filter(isActiveParticipant),
      history
    ).map((p) => ({
      ...p,
      chess_elo: eloMap.get(p.user_id) || eloOf(p.users || p),
    }));
    const sorted = sortByScoreAndElo(scored);
    const pairings = softPairScoreGroups(sorted, history);

    for (const pair of pairings) {
      if (pair.is_bye) {
        history.push({
          id: `soft-bye-${roundNumber}-${pair.player_a_id}`,
          round_number: roundNumber,
          player_a_id: pair.player_a_id,
          player_b_id: pair.player_a_id,
          is_bye: true,
          is_absent: false,
          match_status: 'completed',
          result_winner: 'a',
        });
        continue;
      }

      const eloA = eloMap.get(pair.player_a_id) || DEFAULT_ELO;
      const eloB = eloMap.get(pair.player_b_id) || DEFAULT_ELO;
      const h2h = computeHeadToHead(pair.player_a_id, pair.player_b_id, history);
      const probs = matchOutcomeProbabilities(eloA, eloB, h2h);
      history.push({
        id: `soft-${roundNumber}-${pair.player_a_id}-${pair.player_b_id}`,
        round_number: roundNumber,
        player_a_id: pair.player_a_id,
        player_b_id: pair.player_b_id,
        is_bye: false,
        is_absent: false,
        match_status: 'completed',
        result_winner: pickOutcome(probs, rng),
      });
    }
  }

  return history;
}

/**
 * Monte Carlo tournament win probabilities.
 * Always conditioned on completed results so far; incomplete fixtures + unpaired
 * future Swiss rounds are resimulated each call (every standings fetch / round).
 * @returns {Map<string, number>} user_id → probability 0..1
 */
function simulateTournamentWinOdds(participants, matches, competition, options = {}) {
  const sims = options.simulations || MONTE_CARLO_SIMS;
  const tournamentType = competition.tournament_type || 'round_robin';
  const rng = mulberry32(options.seed ?? Date.now() % 1e9);
  const eloMap = eloByParticipantId(participants);
  const futureSwiss = unpairedSwissRoundsAhead(competition, matches);

  const incomplete = (matches || []).filter(
    (m) =>
      !m.is_bye &&
      m.player_a_id &&
      m.player_b_id &&
      ['pending', 'ongoing', 'result_submitted', 'disputed'].includes(m.match_status)
  );

  const matchModels = incomplete.map((m) => {
    const eloA = m.player_a
      ? eloOf(m.player_a)
      : eloMap.get(m.player_a_id) || DEFAULT_ELO;
    const eloB = m.player_b
      ? eloOf(m.player_b)
      : eloMap.get(m.player_b_id) || DEFAULT_ELO;
    const h2h = computeHeadToHead(m.player_a_id, m.player_b_id, matches);
    const probs = matchOutcomeProbabilities(eloA, eloB, h2h);
    return { matchId: m.id, probs };
  });
  const modelById = new Map(matchModels.map((m) => [m.matchId, m]));

  const hasSoftSwiss = tournamentType === 'swiss' && futureSwiss > 0;

  const winCounts = new Map();
  for (const p of participants || []) {
    if (['registered', 'active', 'eliminated'].includes(p.participant_status)) {
      winCounts.set(p.user_id, 0);
    }
  }

  if (matchModels.length === 0 && !hasSoftSwiss) {
    const standings = computeStandings(participants, matches, { tournamentType });
    if (standings[0]) winCounts.set(standings[0].user_id, sims);
  } else {
    for (let i = 0; i < sims; i++) {
      let simulated = (matches || []).map((m) => {
        const model = modelById.get(m.id);
        if (!model) return m;
        return {
          ...m,
          match_status: 'completed',
          result_winner: pickOutcome(model.probs, rng),
          is_absent: false,
          is_bye: Boolean(m.is_bye),
        };
      });

      if (hasSoftSwiss) {
        simulated = simulateFutureSwissRounds({
          participants,
          trialMatches: simulated,
          competition,
          eloMap,
          rng,
          futureRoundCount: futureSwiss,
        });
      }

      const standings = computeStandings(participants, simulated, { tournamentType });
      const top = standings[0];
      if (top) {
        winCounts.set(top.user_id, (winCounts.get(top.user_id) || 0) + 1);
      }
    }
  }

  const out = new Map();
  for (const [uid, count] of winCounts) {
    out.set(uid, count / sims);
  }
  return out;
}

/**
 * Attach tournament_win_pct (+ formatted) onto standings rows.
 */
function attachTournamentOdds(standings, participants, matches, competition, options = {}) {
  const oddsMap = simulateTournamentWinOdds(participants, matches, competition, options);
  let total = 0;
  const enriched = standings.map((row) => {
    const p = oddsMap.get(row.user_id) || 0;
    total += p;
    return {
      ...row,
      tournament_win_pct: formatPct(p),
      tournament_win_prob: p,
    };
  });

  // Normalize rounding drift so displayed % ~ 100
  if (total > 0 && enriched.length > 0) {
    const scaled = enriched.map((row) => ({
      ...row,
      tournament_win_pct: formatPct(row.tournament_win_prob / total),
    }));
    // Fix residual so max favorite absorbs 0.1 drift
    const sumPct = scaled.reduce((s, r) => s + r.tournament_win_pct, 0);
    const drift = Math.round((100 - sumPct) * 10) / 10;
    if (drift !== 0) {
      let bestIdx = 0;
      for (let i = 1; i < scaled.length; i++) {
        if (scaled[i].tournament_win_pct > scaled[bestIdx].tournament_win_pct) bestIdx = i;
      }
      scaled[bestIdx] = {
        ...scaled[bestIdx],
        tournament_win_pct: Math.round((scaled[bestIdx].tournament_win_pct + drift) * 10) / 10,
      };
    }
    return scaled.map(({ tournament_win_prob, ...rest }) => rest);
  }

  return enriched.map(({ tournament_win_prob, ...rest }) => rest);
}

/**
 * All pairwise H2H records for a competition (played pairs only).
 */
function buildCompetitionH2HMatrix(participants, matches) {
  const ids = (participants || [])
    .filter((p) => ['registered', 'active', 'eliminated'].includes(p.participant_status))
    .map((p) => p.user_id);
  const nameById = new Map();
  for (const p of participants || []) {
    const u = p.users || {};
    nameById.set(
      p.user_id,
      u.display_name || u.chess_com_username || u.chess_username || `Player ${p.user_id}`
    );
  }

  const pairs = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const h2h = computeHeadToHead(ids[i], ids[j], matches);
      if (h2h.played === 0) continue;
      pairs.push({
        ...h2h,
        player_a_name: nameById.get(ids[i]),
        player_b_name: nameById.get(ids[j]),
      });
    }
  }
  return pairs;
}

function buildOddsSnapshotPayload(standingsWithOdds, matchesWithOdds, competition) {
  return {
    competition_id: competition.id,
    round_number: competition.current_round ?? null,
    standings_odds: (standingsWithOdds || []).map((r) => ({
      user_id: r.user_id,
      display_name: r.display_name,
      rank: r.rank,
      points: r.points,
      tournament_win_pct: r.tournament_win_pct,
    })),
    match_odds: (matchesWithOdds || [])
      .filter((m) => m.odds && !m.is_bye)
      .map((m) => ({
        match_id: m.id,
        round_number: m.round_number,
        player_a_id: m.player_a_id,
        player_b_id: m.player_b_id,
        match_status: m.match_status,
        ...m.odds,
      })),
  };
}

module.exports = {
  eloExpectedScore,
  computeHeadToHead,
  matchOutcomeProbabilities,
  computeMatchOdds,
  enrichMatchesWithOdds,
  simulateTournamentWinOdds,
  attachTournamentOdds,
  buildCompetitionH2HMatrix,
  buildOddsSnapshotPayload,
  hydrateChessComRatings,
  hydrateOddsEntities,
  eloOf,
  DEFAULT_ELO,
  MONTE_CARLO_SIMS,
};
