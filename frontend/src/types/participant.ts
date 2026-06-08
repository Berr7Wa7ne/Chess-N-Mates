export type ParticipantStatus = 'registered' | 'active' | 'eliminated' | 'withdrawn'

export interface Participant {
  id: number
  competition_id: number
  user_id: number
  participant_status: ParticipantStatus
  score: number
  wins: number
  draws: number
  losses: number
  joined_at: string
  eliminated_at?: string | null
}

export interface JoinCompetitionPayload {
  user_id: number
}

export interface WithdrawParticipantPayload {
  reason?: string
}

export interface EliminateParticipantPayload {
  reason?: string
}

export interface ParticipantActionResult {
  participant_id: number
  previous_status: ParticipantStatus
  new_status: ParticipantStatus
  eliminated_at?: string
  timestamp: string
}
