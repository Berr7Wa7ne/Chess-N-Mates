export type UserStatus = 'active' | 'inactive' | 'banned' | 'pending'
export type ChessPlatform = 'chess.com' | 'lichess' | 'none'
export type UserRole = 'admin' | 'player'

export interface User {
  id: string
  email?: string
  phone_number: string
  whatsapp_id: string
  whatsapp_phone?: string
  display_name: string
  role: UserRole
  avatar_url?: string | null
  chess_username?: string | null
  chess_platform?: ChessPlatform
  chess_elo?: number
  chess_id?: string | null
  user_status?: UserStatus
  last_activity_at?: string
  created_at?: string
  updated_at?: string
}

export interface AuthUser {
  id: string
  phone_number: string
  display_name: string
  role: UserRole
}

export interface RegisterUserPayload {
  phone_number: string
  whatsapp_id: string
  display_name: string
  role?: UserRole
}

export interface LoginPayload {
  phone_number: string
}

export interface RegisterChessPayload {
  chess_username: string
  chess_platform: Exclude<ChessPlatform, 'none'>
}

export interface UpdateUserPayload {
  display_name?: string
  avatar_url?: string | null
}

export interface ActivityLogEntry {
  id: string
  user_id: string
  action: string
  entity_type?: string
  entity_id?: string
  created_at: string
}
