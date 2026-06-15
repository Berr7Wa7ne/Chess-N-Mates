export type TournamentType = 'knockout' | 'swiss' | 'round_robin'
export type CompetitionStatus =
  | 'draft'
  | 'open_registration'
  | 'active'
  | 'completed'
  | 'cancelled'

export type MatchLength = 'single_match' | 'best_of_3' | 'best_of_5'
export type Platform = 'chess.com' | 'lichess' | 'over_the_board' | 'others'
export type FormatMatchRule =
  | 'single_elimination'
  | 'two_game_match'
  | 'single_game_per_round'
  | 'two_game_round'
  | 'single_leg'
  | 'double_leg'

export interface Competition {
  id: string
  name: string
  description?: string | null

  // New structured fields replacing description
  time_control?: string | null
  timezone?: string
  entry_fee_prize?: string | null
  platform?: string
  match_length?: string
  format_match_rules?: string
  rules?: string[]
  round_robin_legs?: number

  tournament_type: TournamentType
  competition_status: CompetitionStatus
  registration_open_at?: string | null
  registration_close_at?: string | null
  start_date?: string | null
  end_date?: string | null
  max_participants: number
  rounds: number
  current_round: number
  min_elo?: number
  max_elo?: number
  allow_guest_participants?: boolean
  participant_count?: number
  created_by: string
  created_at?: string
  updated_at?: string
}

export interface CreateCompetitionPayload {
  name: string
  tournament_type: TournamentType
  max_participants?: number
  rounds?: number
  registration_open_at: string
  registration_close_at: string
  start_date: string
  end_date: string
  min_elo?: number
  max_elo?: number
  created_by: string

  // New structured fields
  time_control?: string
  timezone?: string
  entry_fee_prize?: string
  platform?: string
  match_length?: string
  format_match_rules?: string
  rules?: string[]
  round_robin_legs?: number
}

export interface UpdateCompetitionPayload {
  name?: string
  tournament_type?: TournamentType
  competition_status?: CompetitionStatus
  current_round?: number
  registration_open_at?: string
  registration_close_at?: string
  start_date?: string
  end_date?: string
  max_participants?: number
  rounds?: number
  min_elo?: number
  max_elo?: number
  time_control?: string
  timezone?: string
  entry_fee_prize?: string
  platform?: string
  match_length?: string
  format_match_rules?: string
  rules?: string[]
  round_robin_legs?: number
}

export interface CompetitionListParams {
  status?: CompetitionStatus
  type?: TournamentType
  limit?: number
  offset?: number
}

export interface StartCompetitionResult {
  competition_id: string
  action: string
  round: number
  fixtures_generated: number
  timestamp: string
}

export interface AdvanceRoundPayload {
  include_pending_matches?: boolean
}

export interface AdvanceRoundResult {
  competition_id: string
  previous_round: number
  current_round: number
  fixtures_generated: number
  unresolved_matches: number
  timestamp: string
  action?: string
}

export interface StandingEntry {
  rank: number
  user_id: string
  display_name: string
  chess_username?: string | null
  chess_elo?: number
  score: number
  wins: number
  draws: number
  losses: number
}