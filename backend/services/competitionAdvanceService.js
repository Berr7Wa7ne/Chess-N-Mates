/**
 * Shared competition round advancement (admin / bot / daily compute).
 */

const { supabaseAdmin } = require('../config/supabase');
const { generateFixtures } = require('./fixtureGenerator');
const { emitWebhook } = require('./webhookService');
const {
  fixturesToMatchRows,
  applyByeParticipantUpdates,
  eliminateKnockoutLosers,
} = require('./tournamentLifecycle');
const { fetchParticipantsWithUsers, timestamp } = require('../utils/competitionHelpers');

/**
 * Advance an active competition to the next round (or complete it).
 *
 * @param {string} competitionId
 * @param {{ includePendingMatches?: boolean }} [options]
 * @returns {Promise<{ success: boolean, data?: object, error?: string, status?: number }>}
 */
async function advanceCompetitionRound(competitionId, options = {}) {
  const includePendingMatches = Boolean(options.includePendingMatches);

  const { data: competition, error: compError } = await supabaseAdmin
    .from('competitions')
    .select('*')
    .eq('id', competitionId)
    .single();

  if (compError || !competition) {
    return { success: false, status: 404, error: 'Competition not found' };
  }

  if (competition.competition_status !== 'active') {
    return { success: false, status: 400, error: 'Competition is not active' };
  }

  const currentRound = competition.current_round || 1;

  const { data: roundMatches } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('round_number', currentRound);

  const unresolved = (roundMatches || []).filter((m) => m.match_status !== 'completed');

  if (unresolved.length > 0 && !includePendingMatches) {
    return {
      success: false,
      status: 400,
      error: `${unresolved.length} match(es) in round ${currentRound} are not completed`,
    };
  }

  const nextRound = currentRound + 1;
  const maxRounds = competition.rounds || 1;

  if (nextRound > maxRounds && competition.tournament_type !== 'knockout') {
    await supabaseAdmin
      .from('competitions')
      .update({ competition_status: 'completed', end_date: timestamp() })
      .eq('id', competitionId);

    return {
      success: true,
      data: {
        competition_id: competitionId,
        previous_round: currentRound,
        current_round: currentRound,
        fixtures_generated: 0,
        unresolved_matches: unresolved.length,
        timestamp: timestamp(),
        action: 'completed',
      },
    };
  }

  const participants = await fetchParticipantsWithUsers(competitionId);
  const { data: allMatches } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('competition_id', competitionId);

  const completedMatches = (allMatches || []).filter((m) => m.match_status === 'completed');

  if (competition.tournament_type === 'knockout') {
    await eliminateKnockoutLosers(supabaseAdmin, competitionId, completedMatches, currentRound);

    const roundWinners = completedMatches
      .filter((m) => m.round_number === currentRound)
      .map((m) => {
        if (m.is_bye) return m.player_a_id;
        if (m.result_winner === 'a') return m.player_a_id;
        if (m.result_winner === 'b') return m.player_b_id;
        return null;
      })
      .filter(Boolean);

    if (roundWinners.length <= 1) {
      await supabaseAdmin
        .from('competitions')
        .update({ competition_status: 'completed', end_date: timestamp() })
        .eq('id', competitionId);

      return {
        success: true,
        data: {
          competition_id: competitionId,
          previous_round: currentRound,
          current_round: currentRound,
          fixtures_generated: 0,
          unresolved_matches: unresolved.length,
          timestamp: timestamp(),
          action: 'completed',
        },
      };
    }
  }

  const fixtures = generateFixtures(
    competition,
    participants,
    allMatches || [],
    completedMatches,
    nextRound
  );

  const deadlineDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const matchRows = fixturesToMatchRows(competitionId, fixtures, nextRound, deadlineDate);

  if (matchRows.length > 0) {
    const { error: matchError } = await supabaseAdmin.from('matches').insert(matchRows);
    if (matchError) {
      return { success: false, status: 400, error: matchError.message };
    }
  }

  await applyByeParticipantUpdates(
    supabaseAdmin,
    competitionId,
    fixtures.filter((f) => f.is_bye)
  );

  await supabaseAdmin
    .from('competitions')
    .update({ current_round: nextRound })
    .eq('id', competitionId);

  emitWebhook('round.advanced', {
    competition_id: competitionId,
    name: competition.name,
    previous_round: currentRound,
    current_round: nextRound,
    fixtures_generated: matchRows.length,
    unresolved_matches: unresolved.length,
  });

  return {
    success: true,
    data: {
      competition_id: competitionId,
      previous_round: currentRound,
      current_round: nextRound,
      fixtures_generated: matchRows.length,
      unresolved_matches: unresolved.length,
      timestamp: timestamp(),
      action: 'advanced',
    },
  };
}

module.exports = { advanceCompetitionRound };
