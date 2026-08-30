"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import {
  AdminPageHeader,
  AdminPageShell,
  AdminPanel,
} from "@/components/layout"
import { useUser } from "@/src/hooks/useUsers"
import { cn } from "@/lib/utils"

function formatRelativeTime(iso?: string): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return "Just now"
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export default function MemberDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { data: member, isLoading, isError } = useUser(id)

  if (isLoading) {
    return (
      <AdminPageShell>
        <p className="text-sm text-text-secondary">Loading member…</p>
      </AdminPageShell>
    )
  }

  if (isError || !member) {
    return (
      <AdminPageShell>
        <Link
          href="/admin/members"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="size-4" />
          Members
        </Link>
        <p className="mt-4 text-sm text-text-secondary">Member not found.</p>
      </AdminPageShell>
    )
  }

  const chess =
    member.chess_username ||
    member.chess_com_username ||
    member.lichess_username

  const rows = [
    { label: "Name", value: member.display_name },
    { label: "Phone", value: member.phone_number || "—" },
    {
      label: "Chess username",
      value: chess
        ? `${chess}${member.chess_elo != null ? ` · ${member.chess_elo}` : ""}`
        : "—",
    },
    { label: "Platform", value: member.chess_platform || "—" },
    { label: "Status", value: member.user_status || "active" },
    { label: "Role", value: member.role },
    {
      label: "Last active",
      value: formatRelativeTime(member.last_activity_at || member.updated_at),
    },
  ]

  return (
    <AdminPageShell>
      <Link
        href="/admin/members"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="size-4" />
        Members
      </Link>
      <AdminPageHeader title={member.display_name} description="Member details" />
      <AdminPanel className="py-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-6 border-b border-border-subtle py-4 last:border-b-0"
          >
            <span className="shrink-0 text-[13px] font-medium text-text-secondary">
              {row.label}
            </span>
            <span
              className={cn(
                "min-w-0 text-right text-[15px] font-semibold capitalize text-text-primary"
              )}
            >
              {row.value}
            </span>
          </div>
        ))}
      </AdminPanel>
      <Link
        href={`/admin/players/${member.id}`}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-bg-panel-dark px-4 text-sm font-semibold text-white"
      >
        View player profile
      </Link>
    </AdminPageShell>
  )
}
