'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  clearAuthCookies,
  clearStoredUser,
  getDashboardPath,
  getStoredUser,
  setAuthCookies,
  setStoredUser,
} from '@/src/lib/auth-storage'
import { userService } from '@/src/services/user.service'
import type { AuthUser, User, UserRole } from '@/src/types/user'

interface AuthContextValue {
  user: User | null
  currentUser: User | null
  role: UserRole | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (payload: {
    phone: string
    password: string
    role: UserRole
    admin_code?: string
  }) => Promise<AuthUser>
  logout: () => void
  setUser: (user: User | AuthUser) => void
  getDashboardPath: () => string
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  /** Always-current user snapshot for stable callbacks (avoids stale closures). */
  const userRef = useRef<User | null>(null)

  useEffect(() => {
    const storedUser = getStoredUser()
    userRef.current = storedUser
    if (storedUser?.role) {
      setAuthCookies(storedUser.role)
    }
    setUserState(storedUser)
    setIsLoading(false)
  }, [])

  const login = useCallback(
    async ({
      phone,
      password,
      role,
      admin_code,
    }: {
      phone: string
      password: string
      role: UserRole
      admin_code?: string
    }) => {
      const response = await userService.login({
        phone_number: phone.trim(),
        password,
        role,
        admin_code: admin_code?.trim() || undefined,
      })
      const authUser = response.data

      if (authUser && typeof authUser.id === 'number') {
        authUser.id = String(authUser.id)
      }

      userRef.current = authUser as User
      setStoredUser(authUser)
      setAuthCookies(authUser.role)
      setUserState(authUser as User)

      return authUser
    },
    []
  )

  const logout = useCallback(() => {
    clearStoredUser()
    clearAuthCookies()
    userRef.current = null
    setUserState(null)
  }, [])

  const setUser = useCallback((nextUser: User | AuthUser) => {
    // The portal role is a session choice: a dual-role admin browsing the
    // member portal must stay 'player'. Profile data fetched from the DB
    // carries the real account role - never let it overwrite the session
    // (otherwise RoleGuard/proxy bounce the user into the other portal).
    //
    // Reads the latest user through a ref instead of the closure so this
    // callback keeps a STABLE identity - a setUser whose identity changes
    // on every user update loops forever with effects that depend on it.
    const current = userRef.current
    const sessionRole = current?.role ?? nextUser.role
    const merged = {
      ...(current ?? {}),
      ...nextUser,
      role: sessionRole,
    } as User

    userRef.current = merged
    setStoredUser(merged)
    setAuthCookies(sessionRole)
    setUserState(merged)
  }, [])

  const resolveDashboardPath = useCallback(() => {
    if (!user?.role) return '/login'
    return getDashboardPath(user.role)
  }, [user?.role])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      currentUser: user,
      role: user?.role ?? null,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      setUser,
      getDashboardPath: resolveDashboardPath,
    }),
    [user, isLoading, login, logout, setUser, resolveDashboardPath]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
