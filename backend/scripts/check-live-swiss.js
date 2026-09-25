/**
 * Inspect live Swiss test tournament pairings.
 * Usage: node backend/scripts/check-live-swiss.js [competitionId]
 */
require('../config/env');
const { supabaseAdmin } = require('../config/supabase');
const { generateSwissPairings } = require('../services/tournament/swiss');
const { hasPlayedBefore, withLiveScores } = require('../services/tournament/scoring');
const { computeStandings } = require('../services/standingsService');
const { fetchParticipantsWithUsers } = require('../utils/competitionHelpers');

const DEFAULT_ID = '1be6d849-94a1-4bcb-8c67-1298b5bfc7b2';

async function main() {
  const id = process.argv[2] || DEFAULT_ID;
  const { data: c, error } = await supabaseAdmin
    .from('competitions')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !c) {
    console.log('Competition not found:', id);
    process.exit(1);
  }

  const parts = await fetchParticipantsWithUsers(id);
  const { data: matches } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('competition_id', id)
    .order('round_number');

  const byRound = {};
  for (const m of matches || []) {
    if (!byRound[m.round_number]) byRound[m.round_number] = [];
    byRound[m.round_number].push(m);
  }

  console.log(
    `Competition: ${c.name} | ${c.competition_status} | round ${c.current_round}/${c.rounds} | type=${c.tournament_type}`
  );

  const active = parts.filter((p) => ['active', 'registered'].includes(p.participant_status));
  let issues = 0;

  for (const [r, list] of Object.entries(byRound)) {
    console.log(`\n--- Round ${r} ---`);
    const used = new Set();
    for (const m of list) {
      const a = parts.find((p) => p.user_id === m.player_a_id);
      const b = parts.find((p) => p.user_id === m.player_b_id);
      console.log(
        `${m.is_bye ? 'BYE ' : 'GAME'} ${a?.display_name || m.player_a_id} vs ${
          m.is_bye ? '—' : b?.display_name || m.player_b_id
        } | ${m.match_status} ${m.result_winner || '-'} | deadline ${m.deadline || 'null'}`
      );
      if (used.has(m.player_a_id)) {
        console.log('  ERROR: player_a appears twice');
        issues += 1;
      }
      used.add(m.player_a_id);
      if (!m.is_bye) {
        if (used.has(m.player_b_id)) {
          console.log('  ERROR: player_b appears twice');
          issues += 1;
        }
        used.add(m.player_b_id);
      }
    }

    const expectedByes = active.length % 2;
    const byes = list.filter((m) => m.is_bye).length;
    if (byes !== expectedByes) {
      console.log(`  ERROR: bye count ${byes}, expected ${expectedByes}`);
      issues += 1;
    }
    if (used.size !== active.length) {
      console.log(`  ERROR: coverage ${used.size}/${active.length}`);
      issues += 1;
    }

    // Rematches vs prior completed rounds
    const prior = (matches || []).filter(
      (m) => m.round_number < Number(r) && m.match_status === 'completed' && !m.is_bye
    );
    for (const m of list.filter((x) => !x.is_bye)) {
      if (hasPlayedBefore(prior, m.player_a_id, m.player_b_id)) {
        console.log(
          `  WARN: rematch vs earlier round (${m.player_a_id} / ${m.player_b_id})`
        );
      }
    }

    // Score-group sanity vs prior completed rounds only (Swiss: mostly same-score)
    if (Number(r) > 1) {
      const scored = withLiveScores(active, prior);
      const byId = new Map(scored.map((p) => [p.user_id, p]));
      let same = 0;
      let cross = 0;
      for (const m of list.filter((x) => !x.is_bye)) {
        const sa = Number(byId.get(m.player_a_id)?.score ?? 0);
        const sb = Number(byId.get(m.player_b_id)?.score ?? 0);
        if (sa === sb) same += 1;
        else cross += 1;
      }
      console.log(`  Score mix (vs prior rounds): ${same} same-score, ${cross} cross-score`);
      // More than half cross-score usually means whole-group float bug
      if (cross > same && cross > 2) {
        console.log(
          `  ERROR: too many cross-score pairings (${cross}/${same + cross}) — expected mostly same-score`
        );
        issues += 1;
      }
    }
  }

  const standings = computeStandings(parts, matches || [], { tournamentType: 'swiss' });
  console.log(
    '\nStandings:',
    standings.map((s) => `${s.rank}. ${s.display_name} ${s.points}pts`).join(' | ')
  );

  const current = c.current_round || 1;
  const cur = byRound[current] || [];
  const pending = cur.filter((m) => m.match_status !== 'completed');
  console.log(`\nCurrent round pending: ${pending.length}`);

  if (pending.length === 0 && current < (c.rounds || 1)) {
    const next = generateSwissPairings(parts, matches || []);
    console.log('Predicted next round:');
    for (const p of next) {
      const a = parts.find((x) => x.user_id === p.player_a_id);
      const b = parts.find((x) => x.user_id === p.player_b_id);
      console.log(
        p.is_bye
          ? `  BYE ${a?.display_name}`
          : `  ${a?.display_name} vs ${b?.display_name}`
      );
      if (!p.is_bye && hasPlayedBefore(matches || [], p.player_a_id, p.player_b_id)) {
        console.log('  WARN: predicted rematch');
        issues += 1;
      }
    }
  }

  console.log(issues === 0 ? '\nLive Swiss pairing: OK' : `\nLive Swiss pairing: ${issues} issue(s)`);
  process.exit(issues === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
