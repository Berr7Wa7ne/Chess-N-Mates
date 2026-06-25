export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'rejected'
export type AdminDecision = 'upheld' | 'overturned' | 'draw'
export type DisputeCategory = 
  | 'wrong_game_link'
  | 'result_mismatch'
  | 'disconnection'
  | 'cheating'
  | 'other'

export interface DisputePlayer {
  id: string
  display_name: string
  chess_com_username?: string | null
}

export interface DisputeMatch {
  id: string
  round_number: number
  result_winner?: string | null
  match_status: string
  chess_game_link?: string | null
  competition_id: string
  player_a: DisputePlayer
  player_b: DisputePlayer
}

export interface Dispute {
  id: string
  match_id: string
  competition_id: string
  category: DisputeCategory
  reason: string
  description?: string | null
  dispute_status: DisputeStatus
  admin_decision?: AdminDecision | null
  admin_notes?: string | null
  filed_by_role: 'player' | 'admin'
  raised_by_user_id: string
  opponent_user_id?: string | null
  resolved_by?: string | null
  resolved_at?: string | null
  created_at: string
  // Joined fields
  match?: DisputeMatch
  competition?: { id: string; name: string; tournament_type?: string }
  raised_by?: DisputePlayer
  opponent?: DisputePlayer
  resolved_by_user?: { id: string; display_name: string }
}

export interface CreateDisputePayload {
  match_id: string
  competition_id: string
  raised_by_user_id: string
  opponent_user_id?: string
  category: DisputeCategory
  reason: string
  description?: string
  filed_by_role: 'player' | 'admin'
}

export interface ResolveDisputePayload {
  admin_decision: AdminDecision
  admin_notes?: string
  new_result_winner?: 'a' | 'b' | 'draw'
  resolved_by: string
}