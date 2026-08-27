import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import {
  AdminPageHeader,
  AdminPageShell,
  AdminPanel,
} from "@/components/layout"
import { members } from "@/lib/admin-data"
import { cn } from "@/lib/utils"

function formatRelativeTime(date: Date): string {
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

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const member = members.find((entry) => entry.id === Number(id))

  if (!member) notFound()

  const rows = [
    { label: "Name", value: member.name },
    { label: "Phone", value: member.phoneNumber },
    {
      label: "Chess username",
      value: member.chessUsername
        ? `${member.chessUsername.username} · ${member.chessUsername.elo}`
        : "—",
    },
    { label: "Status", value: member.status },
    { label: "Registered", value: member.registered ? "Yes" : "No" },
    { label: "Last active", value: formatRelativeTime(member.lastActiveAt) },
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
      <AdminPageHeader title={member.name} description="Member details" />
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
    </AdminPageShell>
  )
}
