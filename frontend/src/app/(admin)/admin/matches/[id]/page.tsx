"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { AdminPageShell } from "@/components/layout"
import { useMatch } from "@/src/hooks/useMatches"

/** Legacy route — send admins to the real competition matches tooling. */
export default function AdminMatchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.id as string
  const { data: match, isLoading, isError } = useMatch(matchId)

  useEffect(() => {
    if (match?.competition_id) {
      router.replace(`/admin/competitions/${match.competition_id}/matches`)
    }
  }, [match?.competition_id, router])

  if (isLoading || match?.competition_id) {
    return (
      <AdminPageShell>
        <p className="text-sm text-text-secondary">Opening competition matches…</p>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell>
      <Link
        href="/admin/competitions"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="size-4" />
        Competitions
      </Link>
      <p className="mt-4 text-sm text-text-secondary">
        {isError ? "Match not found." : "Unable to locate this match’s competition."}
      </p>
    </AdminPageShell>
  )
}
