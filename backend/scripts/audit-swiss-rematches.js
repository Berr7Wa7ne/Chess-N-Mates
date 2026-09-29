/**
 * Audit Swiss pairings for rematches, and preview what the engine would draw.
 *
 * Read-only. A "rematch" = a pairing whose two players have already met in an
 * earlier COMPLETED match of the same competition. The published competition
 * rules say "rematches are avoided wherever possible", so a rematch in the drawn
 * fixtures is a bug worth investigating (see backend/services/tournament/swiss.js).
 *
 * Usage:
 *   node backend/scripts/audit-swiss-rematches.js
 *   node backend/scripts/audit-swiss-rematches.js <competitionId>
 *   node backend/scripts/audit-swiss-rematches.js <competitionId> <previewRound>
 *
 * With <previewRound> the preview is drawn from matches in earlier rounds only
 * (useful to re-check a round that was drawn before a fix was applied).
 *
 * Exit codes: 0 = no actionable rematches | 1 = a pending fixture repeats a meeting
 * (already-played rematches are reported but never fail the check)
 */

require('../config/env');
const { supabaseAdmin } = require('../config/supabase');
const { generateSwissPairings } = require('../services/tournament/swiss');
const { hasPlayedBefore } = require('../services/tournament/scoring');
const { fetchParticipantsWithUsers } = require('../utils/competitionHelpers');

const SELECT_FIELDS =
  'id, name, tournament_type, competition_status, current_round, rounds, time_control';

async function loadCompetitions(competitionId) {
  if (competitionId) {
    const { data, error } = await supabaseAdmin
      .from('competitions')
      .select(SELECT_FIELDS)
      .eq('id', competitionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? [data] : [];
  }

  const { data, error } = await supabaseAdmin
    .from('competitions')
    .select(SELECT_FIELDS)
    .eq('tournament_type', 'swiss')
    .in('competition_status', ['active', 'open_registration'])
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

async function auditCompetition(competition, previewRound) {
  const { data: matches, error } = await supabaseAdmin
    .from('matches')
    .select('id, round_number, player_a_id, player_b_id, match_status, result_winner, is_bye, created_at')
    .eq('competition_id', competition.id)
    .order('round_number');
  if (error) throw new Error(error.message);

  const all = matches || [];
  const participants = await fetchParticipantsWithUsers(competition.id);
  const nameById = new Map(participants.map((p) => [p.user_id, p.display_name]));
  const label = (id) => nameById.get(id) || id;

  console.log(`\n=== ${competition.name} (${competition.id}) ===`);
  console.log(
    `status ${competition.competition_status} | round ${competition.current_round}/${competition.rounds} | TC ${competition.time_control || '-'} | fixtures ${all.length}`
  );

  // 1. rematches already present in the drawn fixtures.
  //    ACTIONABLE = pending/ongoing fixture repeating an earlier meeting (re-draw it).
  //    HISTORICAL = already played, the result stands (informational only).
  const firstSeen = new Map();
  let found = 0;
  let historical = 0;
  const rounds = [...new Set(all.map((m) => Number(m.round_number)))].sort((a, b) => a - b);

  for (const round of rounds) {
    for (const m of all.filter((x) => Number(x.round_number) === round)) {
      if (m.is_bye) continue;
      const key = [m.player_a_id, m.player_b_id].sort().join('|');
      if (firstSeen.has(key)) {
        const played = ['completed', 'cancelled'].includes(m.match_status);
        if (played) historical += 1;
        else found += 1;
        console.log(
          `  [${played ? 'REMATCH played' : 'REMATCH actionable'}] round ${round}: ${label(m.player_a_id)} vs ${label(m.player_b_id)} - already met in round ${firstSeen.get(key)} (${m.match_status}, ${m.id})`
        );
      } else {
        firstSeen.set(key, round);
      }
    }
  }

  if (found + historical === 0) {
    console.log('  drawn fixtures: no rematches');
  } else {
    console.log(`  drawn fixtures: ${found} actionable, ${historical} already played`);
  }

  // 2. what the engine would draw for the next (or a given) round
  if (competition.tournament_type !== 'swiss') {
    console.log(`  preview skipped (${competition.tournament_type} competition)`);
    return found;
  }

  const current = Number(competition.current_round || 0);
  let history;
  let target;

  if (previewRound) {
    target = Number(previewRound);
    history = all.filter((m) => Number(m.round_number) < target);
  } else {
    const unfinished = all.filter(
      (m) => Number(m.round_number) === current && m.match_status !== 'completed' && !m.is_bye
    );
    if (unfinished.length > 0) {
      console.log(`  preview skipped: round ${current} still has ${unfinished.length} unfinished match(es).`);
      console.log(
        `  tip: re-check an already drawn round with: node backend/scripts/audit-swiss-rematches.js ${competition.id} <round>`
      );
      return found;
    }
    if (current >= Number(competition.rounds || 0)) {
      console.log('  preview skipped: final round reached');
      return found;
    }
    target = current + 1;
    history = all.filter((m) => Number(m.round_number) < target);
  }

  const preview = generateSwissPairings(participants, history);
  const previewKeys = new Set();
  let previewRematches = 0;

  console.log(`  engine preview for round ${target} (history: rounds < ${target}):`);
  for (const g of preview) {
    if (g.is_bye) {
      console.log(`    BYE    ${label(g.player_a_id)}`);
      continue;
    }
    const key = [g.player_a_id, g.player_b_id].sort().join('|');
    const repeat = hasPlayedBefore(history, g.player_a_id, g.player_b_id) || previewKeys.has(key);
    if (repeat) previewRematches += 1;
    previewKeys.add(key);
    console.log(`    ${repeat ? '[REMATCH] ' : ''}${label(g.player_a_id)} vs ${label(g.player_b_id)}`);
  }
  console.log(`  preview rematches: ${previewRematches}`);

  return found + previewRematches;
}

async function main() {
  const competitionId = process.argv[2];
  const previewRound = process.argv[3];
  const competitions = await loadCompetitions(competitionId);

  if (competitions.length === 0) {
    console.error(
      competitionId ? `Competition ${competitionId} not found.` : 'No Swiss competitions are active.'
    );
    process.exit(1);
  }

  let total = 0;
  for (const competition of competitions) {
    total += await auditCompetition(competition, previewRound);
  }

  console.log(`\nTotal actionable rematches across ${competitions.length} competition(s): ${total}`);
  if (total === 0) {
    console.log('(rematches that were already played are informational only and never fail the check)');
  } else {
    console.log('Fix: re-draw the affected round - node backend/scripts/rebuild-swiss-round.js <competitionId> <round>');
  }
  process.exitCode = total > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error('Audit failed:', err.message || err);
  process.exit(1);
});

