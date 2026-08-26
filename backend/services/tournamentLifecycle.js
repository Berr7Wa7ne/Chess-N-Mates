/**
 * Shared helpers for competition start / advance lifecycle.
 */

const { POINTS } = require('./tournament/scoring');
const { getKnockoutLosers } = require('./tournament/knockout');

function fixturesToMatchRows(competitionId, fixtures, roundFallback, deadlineDate) {
  return (fixtures || [])
    .filter((f) => f.player_a_id && f.player_b_id)
    .map((f) => ({
      competition_id: competitionId,
      round_number: f.round_number || roundFallback,
      player_a_id: f.player_a_id,
      player_b_id: f.player_b_id,
      match_status: f.is_bye ? 'completed' : 'pending',
      is_bye: Boolean(f.is_bye),
      result_winner: f.is_bye ? 'a' : null,
      leg: f.leg || 1,
      deadline: f.is_bye ? null : deadlineDate,
    }));
}

/**
 * Award bye points (+2) and bye count on competition_participants.
 * Idempotent per call for the given bye fixtures only.
 */
async function applyByeParticipantUpdates(supabaseAdmin, competitionId, byeFixtures) {
  if (!byeFixtures || byeFixtures.length === 0) return;

  const byeUserIds = [...new Set(byeFixtures.map((f) => f.player_a_id).filter(Boolean))];

  const { data: participants } = await supabaseAdmin
    .from('competition_participants')
    .select('*')
    .eq('competition_id', competitionId)
    .in('user_id', byeUserIds);

  for (const part of participants || []) {
    await supabaseAdmin
      .from('competition_participants')
      .update({
        score: Number(part.score || 0) + POINTS.BYE,
        byes: Number(part.byes || 0) + 1,
      })
      .eq('id', part.id);
  }
}

async function eliminateKnockoutLosers(supabaseAdmin, competitionId, completedMatches, roundNumber) {
  const losers = getKnockoutLosers(completedMatches, roundNumber);
  if (losers.length === 0) return;

  const now = new Date().toISOString();
  await supabaseAdmin
    .from('competition_participants')
    .update({ participant_status: 'eliminated', eliminated_at: now })
    .eq('competition_id', competitionId)
    .in('user_id', losers)
    .in('participant_status', ['active', 'registered']);
}

module.exports = {
  fixturesToMatchRows,
  applyByeParticipantUpdates,
  eliminateKnockoutLosers,
};
