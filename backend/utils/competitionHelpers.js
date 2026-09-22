const { supabase, supabaseAdmin } = require('../config/supabase');

async function getParticipantCount(competitionId) {
  const { count, error } = await supabaseAdmin
    .from('competition_participants')
    .select('*', { count: 'exact', head: true })
    .eq('competition_id', competitionId)
    .neq('participant_status', 'withdrawn');

  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function attachParticipantCounts(competitions) {
  if (!competitions.length) return competitions;

  const ids = competitions.map((c) => c.id);
  const { data, error } = await supabaseAdmin
    .from('competition_participants')
    .select('competition_id')
    .in('competition_id', ids)
    .neq('participant_status', 'withdrawn');

  if (error) throw new Error(error.message);

  const counts = {};
  for (const row of data || []) {
    counts[row.competition_id] = (counts[row.competition_id] || 0) + 1;
  }

  return competitions.map((c) => ({
    ...c,
    participant_count: counts[c.id] || 0,
  }));
}

async function fetchParticipantsWithUsers(competitionId) {
  const { data, error } = await supabaseAdmin
    .from('competition_participants')
    .select(`
      *,
      users ( id, display_name, chess_username, chess_com_username, chess_elo )
    `)
    .eq('competition_id', competitionId);

  if (error) throw new Error(error.message);

  return (data || []).map((p) => {
    const user = p.users || {};
    return {
      ...p,
      chess_elo: user.chess_elo ?? 1000,
      display_name: user.display_name || user.chess_com_username || user.chess_username || `Player ${p.user_id}`,
    };
  });
}

function isRegistrationOpen(competition) {
  if (competition.competition_status !== 'open_registration') return false;

  const now = Date.now();
  if (competition.registration_open_at && new Date(competition.registration_open_at).getTime() > now) {
    return false;
  }
  if (competition.registration_close_at && new Date(competition.registration_close_at).getTime() < now) {
    return false;
  }
  return true;
}

function timestamp() {
  return new Date().toISOString();
}

/**
 * Round play window end as ISO string.
 * Uses competitions.match_deadline_hours (default 24). Same-day events: 1–2.
 */
function matchDeadlineIso(competition, fromDate = new Date()) {
  const raw = Number(competition?.match_deadline_hours);
  const hours = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 168) : 24;
  const base = fromDate instanceof Date ? fromDate : new Date(fromDate);
  return new Date(base.getTime() + hours * 60 * 60 * 1000).toISOString();
}

module.exports = {
  getParticipantCount,
  attachParticipantCounts,
  fetchParticipantsWithUsers,
  isRegistrationOpen,
  timestamp,
  matchDeadlineIso,
};
