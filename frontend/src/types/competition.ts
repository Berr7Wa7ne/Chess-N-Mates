export type TournamentType = 'knockout' | 'swiss' | 'round_robin'
export type CompetitionStatus =
  | 'draft'
  | 'open_registration'
  | 'active'
  | 'completed'
  | 'cancelled'

export interface Competition {
  id: number
  name: string
  description?: string | null
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
  created_by: number
  created_at?: string
  updated_at?: string
}

export interface CreateCompetitionPayload {
  name: string
  description?: string
  tournament_type: TournamentType
  max_participants?: number
  rounds?: number
  registration_open_at: string
  registration_close_at: string
  start_date: string
  end_date: string
  min_elo?: number
  max_elo?: number
  created_by: number
}

export interface UpdateCompetitionPayload {
  name?: string
  description?: string
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
}

export interface CompetitionListParams {
  status?: CompetitionStatus
  type?: TournamentType
  limit?: number
  offset?: number
}

export interface StartCompetitionResult {
  competition_id: number
  action: string
  round: number
  fixtures_generated: number
  timestamp: string
}

export interface AdvanceRoundPayload {
  include_pending_matches?: boolean
}

export interface AdvanceRoundResult {
  competition_id: number
  previous_round: number
  current_round: number
  fixtures_generated: number
  unresolved_matches: number
  timestamp: string
}

export interface StandingEntry {
  rank: number
  user_id: number
  display_name: string
  chess_username?: string | null
  chess_elo?: number
  score: number
  wins: number
  draws: number
  losses: number
}
