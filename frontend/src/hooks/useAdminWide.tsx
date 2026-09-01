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

const STORAGE_KEY = 'cnm_admin_wide'

interface AdminWideContextValue {
  /** True when the admin layout should expand beyond its constrained width. */
  wide: boolean
  toggle: () => void
}

const AdminWideContext = createContext<AdminWideContextValue | null>(null)

/**
 * Full-width preference for the admin dashboard. Persisted to localStorage so
 * it survives navigation and reloads. Only the admin layout consumes this —
 * player-facing routes are unaffected.
 */
export function AdminWideProvider({ children }: { children: ReactNode }) {
  const [wide, setWide] = useState(false)

  useEffect(() => {
    try {
      setWide(window.localStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      // localStorage unavailable — keep default constrained layout
    }
  }, [])

  const toggle = useCallback(() => {
    setWide((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        // ignore persistence failures
      }
      return next
    })
  }, [])

  const value = useMemo(() => ({ wide, toggle }), [wide, toggle])

  return <AdminWideContext.Provider value={value}>{children}</AdminWideContext.Provider>
}

export function useAdminWide() {
  const ctx = useContext(AdminWideContext)
  if (!ctx) {
    throw new Error('useAdminWide must be used within AdminWideProvider')
  }
  return ctx
}