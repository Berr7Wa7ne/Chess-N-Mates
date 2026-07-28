const { supabaseAdmin } = require('../config/supabase')
const { forceResult } = require('./matchesController')
const { emitWebhook } = require('../services/webhookService')

const timestamp = () => new Date().toISOString()

exports.getDisputes = async (req, res) => {
  const { competition_id, status, limit = 50, offset = 0 } = req.query
  let query = supabaseAdmin
    .from('disputes')
    .select(`
      *,
      match:matches(
        id, round_number, result_winner, match_status,
        player_a:users!matches_player_a_id_fkey(id, display_name, chess_com_username),
        player_b:users!matches_player_b_id_fkey(id, display_name, chess_com_username)
      ),
      competition:competitions(id, name),
      raised_by:users!disputes_raised_by_user_id_fkey(id, display_name, chess_com_username),
      opponent:users!disputes_opponent_user_id_fkey(id, display_name, chess_com_username),
      resolved_by_user:users!disputes_resolved_by_fkey(id, display_name)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (competition_id) query = query.eq('competition_id', competition_id)
  if (status) query = query.eq('dispute_status', status)
  const { data, error } = await query
  if (error) return res.status(400).json({ success: false, error: { message: error.message } })
  res.json({ success: true, data })
}

exports.getDispute = async (req, res) => {
  const { id } = req.params
  const { data, error } = await supabaseAdmin
    .from('disputes')
    .select(`
      *,
      match:matches(
        id, round_number, result_winner, match_status, chess_game_link,
        competition_id,
        player_a:users!matches_player_a_id_fkey(id, display_name, chess_com_username),
        player_b:users!matches_player_b_id_fkey(id, display_name, chess_com_username)
      ),
      competition:competitions(id, name, tournament_type),
      raised_by:users!disputes_raised_by_user_id_fkey(id, display_name, chess_com_username),
      opponent:users!disputes_opponent_user_id_fkey(id, display_name, chess_com_username),
      resolved_by_user:users!disputes_resolved_by_fkey(id, display_name)
    `)
    .eq('id', id)
    .single()
  if (error) return res.status(404).json({ success: false, error: { message: 'Dispute not found' } })
  res.json({ success: true, data })
}

exports.createDispute = async (req, res) => {
  const { match_id, competition_id, raised_by_user_id, opponent_user_id, category, reason, description, filed_by_role = 'admin' } = req.body
  if (!match_id || !raised_by_user_id || !reason || !competition_id) {
    return res.status(400).json({ success: false, error: { message: 'match_id, competition_id, raised_by_user_id, and reason are required' } })
  }
  const { error: matchUpdateError } = await supabaseAdmin
    .from('matches')
    .update({ match_status: 'disputed' })
    .eq('id', match_id)
  if (matchUpdateError) return res.status(400).json({ success: false, error: { message: matchUpdateError.message } })
  const { data, error } = await supabaseAdmin
    .from('disputes')
    .insert({
      match_id, competition_id, raised_by_user_id, opponent_user_id: opponent_user_id || null, filed_by_role, category: category || 'other', reason, description: description || null, dispute_status: 'open',
    })
    .select()
    .single()
  if (error) return res.status(400).json({ success: false, error: { message: error.message } })

  // Emit webhook for dispute created
  emitWebhook('dispute.created', {
    dispute_id: data.id,
    match_id,
    competition_id,
    raised_by_user_id,
    reason,
    category: category || 'other',
  })

  res.status(201).json({ success: true, data })
}

exports.updateDisputeStatus = async (req, res) => {
  const { id } = req.params
  const { dispute_status } = req.body
  if (!['open', 'under_review'].includes(dispute_status)) {
    return res.status(400).json({ success: false, error: { message: 'Use resolve endpoint to resolve or reject disputes' } })
  }
  const { data, error } = await supabaseAdmin
    .from('disputes')
    .update({ dispute_status })
    .eq('id', id)
    .select()
    .single()
  if (error) return res.status(400).json({ success: false, error: { message: error.message } })
  res.json({ success: true, data })
}

exports.resolveDispute = async (req, res) => {
  const { id } = req.params
  const { admin_decision, admin_notes, new_result_winner, resolved_by } = req.body
  if (!admin_decision || !resolved_by) {
    return res.status(400).json({ success: false, error: { message: 'admin_decision and resolved_by are required' } })
  }
  if (['overturned', 'draw'].includes(admin_decision) && !new_result_winner) {
    return res.status(400).json({ success: false, error: { message: 'new_result_winner required when overturning result' } })
  }
  const { data: dispute, error: disputeError } = await supabaseAdmin
    .from('disputes')
    .select('*, match:matches(*)')
    .eq('id', id)
    .single()
  if (disputeError) return res.status(404).json({ success: false, error: { message: 'Dispute not found' } })
  if (['overturned', 'draw'].includes(admin_decision)) {
    const match = dispute.match
    if (match.match_status === 'completed' || match.match_status === 'disputed') {
      if (match.result_winner) {
        await reverseParticipantScores(match.competition_id, match)
      }
    }
    await supabaseAdmin
      .from('matches')
      .update({
        result_winner: new_result_winner, match_status: 'completed', forced: true, force_reason: `Dispute resolved: ${admin_notes || admin_decision}`,
      })
      .eq('id', match.id)
    await updateParticipantScores(match.competition_id, { ...match, result_winner: new_result_winner })
  } else {
    await supabaseAdmin
      .from('matches')
      .update({ match_status: 'completed' })
      .eq('id', dispute.match_id)
  }
  const { data, error } = await supabaseAdmin
    .from('disputes')
    .update({
      dispute_status: 'resolved', admin_decision, admin_notes: admin_notes || null, resolved_by, resolved_at: timestamp(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) return res.status(400).json({ success: false, error: { message: error.message } })

  // Emit webhook for dispute resolved
  emitWebhook('dispute.resolved', {
    dispute_id: id,
    match_id: dispute.match_id,
    competition_id: dispute.competition_id || data.competition_id,
    admin_decision,
    new_result_winner: new_result_winner || null,
    admin_notes: admin_notes || null,
  })

  res.json({ success: true, data })
}

exports.rejectDispute = async (req, res) => {
  const { id } = req.params
  const { admin_notes, resolved_by } = req.body
  const { data: dispute } = await supabaseAdmin
    .from('disputes')
    .select('match_id')
    .eq('id', id)
    .single()
  if (!dispute) return res.status(404).json({ success: false, error: { message: 'Dispute not found' } })
  await supabaseAdmin
    .from('matches')
    .update({ match_status: 'completed' })
    .eq('id', dispute.match_id)
  const { data, error } = await supabaseAdmin
    .from('disputes')
    .update({
      dispute_status: 'rejected', admin_decision: 'upheld', admin_notes: admin_notes || null, resolved_by: resolved_by || null, resolved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) return res.status(400).json({ success: false, error: { message: error.message } })
  res.json({ success: true, data })
}