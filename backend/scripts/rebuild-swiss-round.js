/**
 * Rebuild a Swiss round with the current pairing engine.
 * Reverses participant score deltas for any completed matches in that round,
 * deletes the round's matches, and inserts fresh pairings from prior rounds.
 *
 * Usage: node backend/scripts/rebuild-swiss-round.js <competitionId> <roundNumber>
 */
require('../config/env');
const { supabaseAdmin } = require('../config/supabase');
const { generateSwissPairings } = require('../services/tournament/swiss');
const { fixturesToMatchRows } = require('../services/tournamentLifecycle');
const {
  fetchParticipantsWithUsers,
  matchDeadlineIso,
} = require('../utils/competitionHelpers');

async function reverseCompletedResult(competitionId, match) {
  if (match.is_bye || match.match_status !== 'completed' || !match.result_winner) return;

  const { data: participants } = await supabaseAdmin
    .from('competition_participants')
    .select('*')
    .eq('competition_id', competitionId)
    .in('user_id', [match.player_a_id, match.player_b_id]);

  const partA = participants?.find((p) => p.user_id === match.player_a_id);
  const partB = participants?.find((p) => p.user_id === match.player_b_id);

  if (match.result_winner === 'a') {
    if (partA) {
      await supabaseAdmin
        .from('competition_participants')
        .update({
          score: Math.max(0, Number(partA.score || 0) - 2),
          wins: Math.max(0, (partA.wins || 0) - 1),
        })
        .eq('id', partA.id);
    }
    if (partB) {
      await supabaseAdmin
        .from('competition_participants')
        .update({ losses: Math.max(0, (partB.losses || 0) - 1) })
        .eq('id', partB.id);
    }
  } else if (match.result_winner === 'b') {
    if (partB) {
      await supabaseAdmin
        .from('competition_participants')
        .update({
          score: Math.max(0, Number(partB.score || 0) - 2),
          wins: Math.max(0, (partB.wins || 0) - 1),
        })
        .eq('id', partB.id);
    }
    if (partA) {
      await supabaseAdmin
        .from('competition_participants')
        .update({ losses: Math.max(0, (partA.losses || 0) - 1) })
        .eq('id', partA.id);
    }
  } else if (match.result_winner === 'draw') {
    if (partA) {
      await supabaseAdmin
        .from('competition_participants')
        .update({
          score: Math.max(0, Number(partA.score || 0) - 1),
          draws: Math.max(0, (partA.draws || 0) - 1),
        })
        .eq('id', partA.id);
    }
    if (partB) {
      await supabaseAdmin
        .from('competition_participants')
        .update({
          score: Math.max(0, Number(partB.score || 0) - 1),
          draws: Math.max(0, (partB.draws || 0) - 1),
        })
        .eq('id', partB.id);
    }
  }
}

async function main() {
  const competitionId = process.argv[2];
  const roundNumber = Number(process.argv[3] || 2);

  if (!competitionId) {
    console.error('Usage: node backend/scripts/rebuild-swiss-round.js <competitionId> <roundNumber>');
    process.exit(1);
  }

  const { data: competition, error: compError } = await supabaseAdmin
    .from('competitions')
    .select('*')
    .eq('id', competitionId)
    .single();

  if (compError || !competition) {
    console.error('Competition not found');
    process.exit(1);
  }

  if (competition.tournament_type !== 'swiss') {
    console.error('Not a Swiss competition:', competition.tournament_type);
    process.exit(1);
  }

  const { data: roundMatches } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('round_number', roundNumber);

  console.log(
    `Rebuilding ${competition.name} round ${roundNumber}: ${(roundMatches || []).length} existing matches`
  );

  for (const m of roundMatches || []) {
    if (m.match_status === 'completed') {
      console.log(
        `  Reversing completed: ${m.player_a_id} vs ${m.player_b_id} → ${m.result_winner}`
      );
      await reverseCompletedResult(competitionId, m);
    }
  }

  const { error: delError } = await supabaseAdmin
    .from('matches')
    .delete()
    .eq('competition_id', competitionId)
    .eq('round_number', roundNumber);

  if (delError) {
    console.error('Delete failed:', delError.message);
    process.exit(1);
  }

  const participants = await fetchParticipantsWithUsers(competitionId);
  const { data: priorMatches } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('competition_id', competitionId)
    .lt('round_number', roundNumber);

  const fixtures = generateSwissPairings(participants, priorMatches || []).map((f) => ({
    ...f,
    round_number: roundNumber,
  }));

  // Keep the previous deadline window if we had one; else fresh from now
  const oldDeadline = (roundMatches || []).find((m) => m.deadline)?.deadline;
  const deadlineDate = oldDeadline || matchDeadlineIso(competition);

  const rows = fixturesToMatchRows(competitionId, fixtures, roundNumber, deadlineDate, {
    activeRound: roundNumber,
  });

  const { error: insertError } = await supabaseAdmin.from('matches').insert(rows);
  if (insertError) {
    console.error('Insert failed:', insertError.message);
    process.exit(1);
  }

  // Ensure competition current_round matches
  if (Number(competition.current_round) !== roundNumber) {
    await supabaseAdmin
      .from('competitions')
      .update({ current_round: roundNumber })
      .eq('id', competitionId);
  }

  const nameById = new Map(
    participants.map((p) => [p.user_id, p.display_name || p.users?.display_name])
  );
  console.log(`\nInserted ${rows.length} pairings (deadline ${deadlineDate}):`);
  for (const r of rows) {
    if (r.is_bye) {
      console.log(`  BYE ${nameById.get(r.player_a_id)}`);
    } else {
      console.log(`  ${nameById.get(r.player_a_id)} vs ${nameById.get(r.player_b_id)}`);
    }
  }
  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
