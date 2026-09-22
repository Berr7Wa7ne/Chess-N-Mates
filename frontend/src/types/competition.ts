export type TournamentType = 'knockout' | 'swiss' | 'round_robin'
export type CompetitionStatus =
  | 'draft'
  | 'open_registration'
  | 'active'
  | 'completed'
  | 'cancelled'

export type MatchLength = 'single_game' | 'double_game' | 'best_of_3' | 'best_of_5'
export type Platform = 'chess.com' | 'lichess' | 'over_the_board' | 'others'

export interface Competition {
  id: string
  name: string
  description?: string | null

  // New structured fields replacing description
  time_control?: string | null
  timezone?: string
  entry_fee?: string | null
  prize?: string | null
  platform?: string
  match_length?: string
  format_match_rules?: string
  rules?: string[]
  round_robin_legs?: number
  auto_compute_enabled?: boolean
  /** Hours each round stays open (1–2 for same-day events). Default 24. */
  match_deadline_hours?: number
  image_url?: string | null
  is_featured?: boolean

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
  entry_fee?: string
  prize?: string
  platform?: string
  match_length?: string
  format_match_rules?: string
  rules?: string[]
  round_robin_legs?: number
  auto_compute_enabled?: boolean
  match_deadline_hours?: number
  image_url?: string | null
  is_featured?: boolean
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
  entry_fee?: string
  prize?: string
  platform?: string
  match_length?: string
  format_match_rules?: string
  rules?: string[]
  round_robin_legs?: number
  auto_compute_enabled?: boolean
  match_deadline_hours?: number
  image_url?: string | null
  is_featured?: boolean
}

export interface ComputeResultsReport {
  competition_id?: string
  competition_name?: string
  scored: number
  needs_review: number
  absent: number
  skipped: number
  advanced: boolean
  advance_action?: string | null
  advance?: {
    current_round?: number
    action?: string
    fixtures_generated?: number
  }
  run_id?: string
  errors: Array<{ message?: string; match_id?: string; competition_id?: string }>
  match_results?: Array<{
    match_id: string
    status: string
    reason?: string
    result_winner?: string
    chess_game_link?: string
    candidates?: Array<{ url: string; result_winner: string; end_time?: number }>
  }>
}

export type ComputeAuditActionResult =
  | 'success'
  | 'skipped'
  | 'needs_review'
  | 'absent'
  | 'error'
  | 'info'

export interface ComputeAuditLog {
  id: string
  created_at: string
  competition_id?: string | null
  match_id?: string | null
  run_id?: string | null
  triggered_by: string
  actor_user_id?: string | null
  action: string
  action_result: ComputeAuditActionResult | string
  message?: string | null
  details?: Record<string, unknown> | null
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
  rank_display?: string
  user_id: string
  display_name: string
  chess_username?: string | null
  chess_elo?: number
  played: number
  wins: number
  draws: number
  losses: number
  points: number
  absences: number
  byes: number
  buchholz?: number
  buchholz_cut1?: number
  sonneborn_berger?: number
  knockout_round_reached?: number
  participant_status?: string
  /** Estimated % chance of winning this tournament (0–100). */
  tournament_win_pct?: number
}
