export type MatchStatus = 'pending' | 'ongoing' | 'result_submitted' | 'completed' | 'disputed' | 'cancelled'
export type ResultWinner = 'a' | 'b' | 'draw'
export type ResultSource = 'manual' | 'player_submit' | 'chess_com_auto' | 'absent_auto'

export interface AutoCandidate {
  url: string
  result_winner: ResultWinner
  end_time?: number
  time_class?: string
  time_control?: string
}

export interface MatchPlayer {
  id: string
  display_name: string
  chess_username?: string | null
  chess_elo?: number
}

export interface Match {
  id: string
  competition_id: string
  round_number: number
  leg: number
  player_a_id: string
  player_b_id: string
  player_a?: MatchPlayer
  player_b?: MatchPlayer
  scheduled_date?: string | null
  deadline?: string | null
  match_status: MatchStatus
  result_winner?: ResultWinner | null
  result_submitted_by?: string | null
  result_submitted_at?: string | null
  chess_game_link?: string | null
  chess_game_id?: string | null
  result_source?: ResultSource | null
  needs_review?: boolean
  auto_candidates?: AutoCandidate[] | null
  forced?: boolean
  force_reason?: string | null
  is_bye?: boolean
  is_absent?: boolean
  is_both_absent?: boolean
  absence_side?: 'a' | 'b' | 'both' | null
  created_at?: string
  updated_at?: string
}

export interface MarkAbsentPayload {
  absence_side: 'a' | 'b' | 'both'
  user_id?: string
}

export interface CompetitionMatchListParams {
  round?: number
  status?: MatchStatus
  player_id?: string
}

export interface SubmitResultPayload {
  result_winner?: ResultWinner
  chess_game_link?: string
  chess_game_id?: string
  user_id: string
}

export interface ForceResultPayload {
  result_winner: ResultWinner
  reason?: string
  is_absent?: boolean
  absence_side?: 'a' | 'b' | 'both'
  chess_game_link?: string
}

export interface ExtendDeadlinePayload {
  hours: number
}

export interface AdminScorePayload {
  result_winner: ResultWinner
  is_absent?: boolean
  absence_side?: 'a' | 'b' | 'both'
}
