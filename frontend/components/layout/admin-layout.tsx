'use client'

import { useState } from 'react'
import { AdminBottomNav } from './admin-bottom-nav'
import { AdminIconRail } from './admin-icon-rail'
import { AdminWideProvider, useAdminWide } from '@/src/hooks/useAdminWide'
import { cn } from '@/lib/utils'
import {
  AppRulesGuide,
  AppRulesTrigger,
} from '@/src/components/admin/app-rules-guide'

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminWideProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminWideProvider>
  )
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { wide } = useAdminWide()
  const [rulesOpen, setRulesOpen] = useState(false)

  return (
    <div className="admin-shell flex h-dvh max-h-dvh overflow-hidden bg-bg-page p-0 text-text-primary md:p-3 lg:p-5">
      <div
        className={cn(
          'mx-auto flex h-full min-h-0 w-full overflow-hidden rounded-none bg-bg-shell md:rounded-[32px]',
          wide ? '' : 'max-w-[1440px]'
        )}
      >
        <AdminIconRail onOpenRules={() => setRulesOpen(true)} />
        <main className="player-main min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:p-4 md:p-5 md:pb-5 lg:p-6">
          <div className="pb-2">{children}</div>
        </main>
      </div>
      <AdminBottomNav />
      <AppRulesTrigger variant="mobile" onClick={() => setRulesOpen(true)} />
      <AppRulesGuide open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  )
}
