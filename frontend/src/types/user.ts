export type UserStatus = 'active' | 'inactive' | 'banned' | 'pending'
export type ChessPlatform = 'chess.com' | 'lichess' | 'over_the_board'
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
  chess_com_username?: string | null
  lichess_username?: string | null
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
  /** Real account role from DB when session role differs (e.g. admin signed in as member). */
  account_role?: UserRole
}

export interface RegisterUserPayload {
  phone_number: string
  display_name?: string
  whatsapp_id?: string | null
  role?: UserRole
  chess_platform?: ChessPlatform | null
  chess_com_username?: string | null
  lichess_username?: string | null
  password?: string
  admin_code?: string
}

export interface LoginPayload {
  phone_number: string
  password: string
  role?: UserRole
  admin_code?: string
}

export interface ChangePasswordPayload {
  current_password: string
  new_password: string
}

export interface ResetPasswordPayload {
  admin_code: string
}

export interface RegisterChessPayload {
  chess_username: string
  chess_platform: ChessPlatform
}

export interface UpdateUserPayload {
  display_name?: string
  avatar_url?: string | null
  chess_username?: string | null
  chess_com_username?: string | null
  lichess_username?: string | null
}

export interface ActivityLogEntry {
  id: string
  user_id: string
  action: string
  entity_type?: string
  entity_id?: string
  created_at: string
}
