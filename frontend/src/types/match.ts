export type MatchStatus =
  | 'pending'
  | 'ongoing'
  | 'result_submitted'
  | 'completed'
  | 'disputed'
  | 'cancelled'

export type MatchResult = 'a' | 'b' | 'draw'

export interface Match {
  id: number
  competition_id: number
  round_number: number
  player_a_id: number
  player_b_id: number
  scheduled_date?: string | null
  deadline?: string | null
  match_status: MatchStatus
  result_winner?: MatchResult | null
  result_submitted_by?: number | null
  result_submitted_at?: string | null
  chess_game_link?: string | null
  chess_game_id?: string | null
  created_at?: string
  updated_at?: string
}
