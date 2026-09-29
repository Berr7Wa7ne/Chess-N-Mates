/**
 * Preview or set `competitions.rounds` - the final round number of an event.
 *
 * Use case: shorten a running Swiss event, e.g. make round 7 the last round of a
 * 10-round tournament. This column is the ONLY thing that decides when an event
 * finishes: competitionAdvanceService.advanceCompetitionRound (and the identical
 * guard in botController) completes the competition as soon as
 * nextRound > competition.rounds.
 *
 * Why nothing else has to change:
 *  - Round deadlines come from `competitions.match_deadline_hours`
 *    (matchDeadlineIso = now + N hours), never from `rounds` or `end_date`,
 *    so no existing clock moves.
 *  - No fixture rows are read or written.
 *  - `end_date` is display-only (fixture export header, "Ends ..." labels) and is
 *    overwritten with the real completion time when the event completes.
 *
 * Guards (the script refuses instead of guessing):
 *  - newRounds cannot be below the round already in progress
 *  - newRounds cannot be below the highest round that already has fixtures
 *
 * Read-only unless --apply is passed.
 *
 * Usage:
 *   node backend/scripts/set-tournament-rounds.js competitionId newRounds [--apply] [--end-date ISO]
 *
 * Examples:
 *   node backend/scripts/set-tournament-rounds.js b70b608d-3d15-412e-b3c2-3edaf917324f 7
 *   node backend/scripts/set-tournament-rounds.js b70b608d-3d15-412e-b3c2-3edaf917324f 7 --apply
 *   node backend/scripts/set-tournament-rounds.js b70b608d-3d15-412e-b3c2-3edaf917324f 7 --apply --end-date 2026-10-01T11:32:52Z
 *
 * Exit codes: 0 = applied or already correct | 1 = refused / error
 */

require('../config/env');
const { supabaseAdmin } = require('../config/supabase');

const SELECT =
  'id, name, tournament_type, competition_status, current_round, rounds, end_date, start_date, match_deadline_hours, auto_compute_enabled, time_control';

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    if (raw === '--apply') {
      flags.apply = true;
    } else if (raw === '--end-date') {
      flags.endDate = argv[i + 1];
      i += 1;
    } else if (raw.startsWith('--end-date=')) {
      flags.endDate = raw.slice('--end-date='.length);
    } else {
      positional.push(raw);
    }
  }
  return { positional: positional, flags: flags };
}

function fail(message) {
  console.error('[ABORT] ' + message);
  process.exit(1);
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const positional = parsed.positional;
  const flags = parsed.flags;
  const competitionId = positional[0];
  const requested = Number(positional[1]);

  if (!competitionId) {
    fail('usage: node backend/scripts/set-tournament-rounds.js competitionId newRounds [--apply] [--end-date ISO]');
  }
  if (!Number.isInteger(requested) || requested < 1) {
    fail('newRounds must be an integer of at least 1 (got "' + positional[1] + '")');
  }

  const compResult = await supabaseAdmin
    .from('competitions')
    .select(SELECT)
    .eq('id', competitionId)
    .maybeSingle();
  if (compResult.error) fail(compResult.error.message);
  const c = compResult.data;
  if (!c) fail('competition not found: ' + competitionId);

  const matchResult = await supabaseAdmin
    .from('matches')
    .select('round_number, match_status')
    .eq('competition_id', competitionId);
  if (matchResult.error) fail(matchResult.error.message);

  const rows = matchResult.data || [];
  const current = Number(c.current_round || 1);
  const perRound = new Map();
  for (const m of rows) {
    const round = Number(m.round_number);
    if (!perRound.has(round)) perRound.set(round, { round: round, total: 0, completed: 0, pending: 0 });
    const bucket = perRound.get(round);
    bucket.total += 1;
    if (m.match_status === 'completed') bucket.completed += 1;
    else bucket.pending += 1;
  }
  const drawn = Array.from(perRound.keys()).sort(function (a, b) { return a - b; });
  const highestDrawn = drawn.length ? drawn[drawn.length - 1] : 0;

  console.log('\n=== ' + c.name + ' (' + c.id + ') ===');
  console.log(
    'type ' + c.tournament_type + ' | status ' + c.competition_status + ' | round ' + current + '/' + c.rounds +
    ' | TC ' + (c.time_control || '-') + ' | deadline ' + (c.match_deadline_hours || 24) + 'h' +
    ' | auto-compute ' + (c.auto_compute_enabled ? 'on' : 'off')
  );
  console.log('start ' + (c.start_date || '-') + ' | end_date ' + (c.end_date || '-'));
  for (const round of drawn) {
    const bucket = perRound.get(round);
    console.log(
      '  round ' + round + ': ' + bucket.total + ' fixtures (' + bucket.completed + ' completed, ' + bucket.pending + ' pending)'
    );
  }
  console.log('  highest drawn round: ' + (highestDrawn || '-') + ' | fixtures total: ' + rows.length);
  console.log('\nrequested: rounds ' + c.rounds + ' -> ' + requested);

  if (requested < current) {
    fail('refusing: ' + requested + ' is below the round in progress (' + current + ')');
  }
  if (requested < highestDrawn) {
    fail('refusing: round ' + highestDrawn + ' already has fixtures; removing drawn rounds is not supported');
  }

  if (requested === Number(c.rounds)) {
    console.log('[NO CHANGE] rounds is already ' + requested + '.');
    process.exit(0);
  }

  const currentBucket = perRound.get(current) || { pending: 0 };
  console.log(
    'effect: round ' + Math.min(current + 1, requested) + ' is the next draw; the competition is completed when advancing from round ' + requested
  );
  if (currentBucket.pending > 0) {
    console.log(
      'note: ' + currentBucket.pending + ' match(es) in round ' + current + ' are still pending - draw the next round only after they are scored, otherwise the brackets are built from incomplete results'
    );
  }
  if (c.competition_status === 'completed') {
    console.log('note: this competition is already completed; changing rounds will not reopen it');
  }

  if (!flags.apply) {
    console.log('\n[dry-run] nothing written. Re-run with --apply to save.');
    process.exit(0);
  }

  const updates = { rounds: requested };
  if (flags.endDate) updates.end_date = new Date(flags.endDate).toISOString();

  const updateResult = await supabaseAdmin
    .from('competitions')
    .update(updates)
    .eq('id', competitionId)
    .select(SELECT)
    .single();
  if (updateResult.error) fail(updateResult.error.message);
  const updated = updateResult.data;

  console.log('\n[APPLIED]');
  console.log('  rounds:   ' + c.rounds + ' -> ' + updated.rounds);
  if (flags.endDate) console.log('  end_date: ' + c.end_date + ' -> ' + updated.end_date);
  console.log('  status ' + updated.competition_status + ' | round ' + updated.current_round + '/' + updated.rounds);
  console.log('  the event now finishes after round ' + updated.rounds + '.');
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
