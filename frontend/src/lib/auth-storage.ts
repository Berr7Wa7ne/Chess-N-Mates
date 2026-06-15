import type { AuthUser, User, UserRole } from '@/src/types/user'

const AUTH_USER_KEY = 'chess_tournament_user'
const PHONE_INDEX_KEY = 'chess_tournament_phone_index'

interface PhoneIndex {
  [phone: string]: string
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(AUTH_USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function setStoredUser(user: User | AuthUser) {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
  const index = getPhoneIndex()
  index[user.phone_number] = user.id
  localStorage.setItem(PHONE_INDEX_KEY, JSON.stringify(index))
}

export function clearStoredUser() {
  localStorage.removeItem(AUTH_USER_KEY)
}

function getPhoneIndex(): PhoneIndex {
  const raw = localStorage.getItem(PHONE_INDEX_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as PhoneIndex
  } catch {
    return {}
  }
}

export function getUserIdByPhone(phone: string): string | null {
  const index = getPhoneIndex()
  return index[phone] ?? null
}

export function setAuthCookies(role: UserRole) {
  document.cookie = 'chess_auth=1; path=/; max-age=2592000; SameSite=Lax'
  document.cookie = `chess_role=${role}; path=/; max-age=2592000; SameSite=Lax`
}

export function clearAuthCookies() {
  document.cookie = 'chess_auth=; path=/; max-age=0'
  document.cookie = 'chess_role=; path=/; max-age=0'
}

export function getDashboardPath(role: UserRole): string {
  return role === 'admin' ? '/admin/dashboard' : '/player/dashboard'
}
