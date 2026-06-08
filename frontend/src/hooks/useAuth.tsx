'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  login: (phone: string) => Promise<AuthUser>
  logout: () => void
  setUser: (user: User | AuthUser) => void
  getDashboardPath: () => string
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedUser = getStoredUser()
    if (storedUser?.role) {
      setAuthCookies(storedUser.role)
    }
    setUserState(storedUser)
    setIsLoading(false)
  }, [])

  const login = useCallback(async (phone: string) => {
    const response = await userService.login({ phone_number: phone.trim() })
    const authUser = response.data

    setStoredUser(authUser)
    setAuthCookies(authUser.role)
    setUserState(authUser as User)

    return authUser
  }, [])

  const logout = useCallback(() => {
    clearStoredUser()
    clearAuthCookies()
    setUserState(null)
  }, [])

  const setUser = useCallback((nextUser: User | AuthUser) => {
    setStoredUser(nextUser)
    if (nextUser.role) {
      setAuthCookies(nextUser.role)
    }
    setUserState(nextUser as User)
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
