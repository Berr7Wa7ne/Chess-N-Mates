const { supabase } = require('../config/supabase');
const {
  getParticipantCount,
  isRegistrationOpen,
  timestamp,
} = require('../utils/competitionHelpers');

exports.joinCompetition = async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({
      success: false,
      error: { message: 'user_id is required' },
    });
  }

  const { data: competition, error: compError } = await supabase
    .from('competitions')
    .select('*')
    .eq('id', id)
    .single();

  if (compError) {
    return res.status(404).json({ success: false, error: { message: 'Competition not found' } });
  }

  if (!isRegistrationOpen(competition)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Competition not open for registration' },
    });
  }

  const participantCount = await getParticipantCount(id);
  if (participantCount >= competition.max_participants) {
    return res.status(400).json({
      success: false,
      error: { message: 'Competition full' },
    });
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, chess_elo')
    .eq('id', user_id)
    .single();

  if (userError) {
    return res.status(404).json({ success: false, error: { message: 'User not found' } });
  }

  const elo = user.chess_elo ?? 1000;
  if (elo < (competition.min_elo ?? 800) || elo > (competition.max_elo ?? 3000)) {
    return res.status(400).json({
      success: false,
      error: { message: 'User ELO outside competition range' },
    });
  }

  const { data: existing } = await supabase
    .from('competition_participants')
    .select('id, participant_status')
    .eq('competition_id', id)
    .eq('user_id', user_id)
    .maybeSingle();

  if (existing && existing.participant_status !== 'withdrawn') {
    return res.status(409).json({
      success: false,
      error: { message: 'User already registered' },
    });
  }

  if (existing?.participant_status === 'withdrawn') {
    const { data, error } = await supabase
      .from('competition_participants')
      .update({
        participant_status: 'registered',
        joined_at: timestamp(),
        eliminated_at: null,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) return res.status(400).json({ success: false, error: { message: error.message } });
    return res.status(201).json({ success: true, data });
  }

  const { data, error } = await supabase
    .from('competition_participants')
    .insert([{
      competition_id: Number(id),
      user_id,
      participant_status: 'registered',
      score: 0,
      wins: 0,
      draws: 0,
      losses: 0,
    }])
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, error: { message: error.message } });
  res.status(201).json({ success: true, data });
};

exports.withdrawParticipant = async (req, res) => {
  const { id, userId } = req.params;

  const { data: competition, error: compError } = await supabase
    .from('competitions')
    .select('competition_status')
    .eq('id', id)
    .single();

  if (compError) {
    return res.status(404).json({ success: false, error: { message: 'Competition not found' } });
  }

  if (competition.competition_status === 'active' || competition.competition_status === 'completed') {
    return res.status(400).json({
      success: false,
      error: { message: 'Cannot withdraw after the tournament has started' },
    });
  }

  const { data: participant, error: partError } = await supabase
    .from('competition_participants')
    .select('*')
    .eq('competition_id', id)
    .eq('user_id', userId)
    .single();

  if (partError) {
    return res.status(404).json({ success: false, error: { message: 'Participant not found' } });
  }

  if (participant.participant_status === 'withdrawn') {
    return res.status(400).json({
      success: false,
      error: { message: 'Participant already withdrawn' },
    });
  }

  const previousStatus = participant.participant_status;

  const { error: updateError } = await supabase
    .from('competition_participants')
    .update({ participant_status: 'withdrawn' })
    .eq('id', participant.id);

  if (updateError) {
    return res.status(400).json({ success: false, error: { message: updateError.message } });
  }

  res.json({
    success: true,
    data: {
      participant_id: participant.id,
      previous_status: previousStatus,
      new_status: 'withdrawn',
      timestamp: timestamp(),
    },
  });
};

exports.eliminateParticipant = async (req, res) => {
  const { id, userId } = req.params;

  const { data: competition, error: compError } = await supabase
    .from('competitions')
    .select('tournament_type, competition_status')
    .eq('id', id)
    .single();

  if (compError) {
    return res.status(404).json({ success: false, error: { message: 'Competition not found' } });
  }

  if (competition.tournament_type !== 'knockout') {
    return res.status(400).json({
      success: false,
      error: { message: 'Elimination is only supported for knockout tournaments' },
    });
  }

  const { data: participant, error: partError } = await supabase
    .from('competition_participants')
    .select('*')
    .eq('competition_id', id)
    .eq('user_id', userId)
    .single();

  if (partError) {
    return res.status(404).json({ success: false, error: { message: 'Participant not found' } });
  }

  if (participant.participant_status === 'eliminated') {
    return res.status(400).json({
      success: false,
      error: { message: 'Participant already eliminated' },
    });
  }

  const previousStatus = participant.participant_status;
  const eliminatedAt = timestamp();

  const { error: updateError } = await supabase
    .from('competition_participants')
    .update({
      participant_status: 'eliminated',
      eliminated_at: eliminatedAt,
    })
    .eq('id', participant.id);

  if (updateError) {
    return res.status(400).json({ success: false, error: { message: updateError.message } });
  }

  res.json({
    success: true,
    data: {
      participant_id: participant.id,
      previous_status: previousStatus,
      new_status: 'eliminated',
      eliminated_at: eliminatedAt,
      timestamp: eliminatedAt,
    },
  });
};
