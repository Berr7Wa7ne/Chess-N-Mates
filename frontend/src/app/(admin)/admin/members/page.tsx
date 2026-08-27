"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Filter, Info, User } from "lucide-react"
import {
  AdminContentModal,
  AdminIconAction,
  AdminIconRow,
  AdminPageHeader,
  AdminPageShell,
  AdminPanel,
} from "@/components/layout"
import { useUsers } from "@/src/hooks/useUsers"
import type { UserStatus } from "@/src/types/user"
import { cn } from "@/lib/utils"

type FilterType = "all" | UserStatus

const filterOptions: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "pending", label: "Pending" },
  { value: "banned", label: "Banned" },
]

function statusLabel(status: UserStatus | undefined) {
  const value = status || "active"
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function chessHandle(member: {
  chess_username?: string | null
  chess_com_username?: string | null
  lichess_username?: string | null
}) {
  return (
    member.chess_username ||
    member.chess_com_username ||
    member.lichess_username ||
    null
  )
}

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

export default function MembersPage() {
  const { data: members = [], isLoading } = useUsers()
  const [filter, setFilter] = useState<FilterType>("all")
  const [filterOpen, setFilterOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filteredMembers = useMemo(
    () =>
      members.filter((member) =>
        filter === "all" ? true : (member.user_status || "active") === filter
      ),
    [filter, members]
  )

  const selected = members.find((m) => String(m.id) === selectedId) ?? null

  return (
    <AdminPageShell>
      <div className="flex items-start justify-between gap-4">
        <AdminPageHeader
          title="Members"
          description={
            isLoading
              ? "Loading community…"
              : `${filteredMembers.length} shown · icons for filters & details`
          }
        />
        <AdminIconRow>
          <AdminIconAction icon={Info} label="About members" onClick={() => setInfoOpen(true)} />
          <AdminIconAction
            icon={Filter}
            label="Filter"
            onClick={() => setFilterOpen(true)}
            active={filter !== "all"}
          />
        </AdminIconRow>
      </div>

      <AdminPanel className="px-0 py-0 sm:px-0">
        {isLoading ? (
          <p className="px-6 py-10 text-center text-sm text-text-secondary sm:px-8">
            Loading members…
          </p>
        ) : filteredMembers.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-text-secondary sm:px-8">
            No members match this filter.
          </p>
        ) : (
          <ul>
            {filteredMembers.map((member) => {
              const handle = chessHandle(member)
              const status = (member.user_status || "active") as UserStatus
              return (
                <li key={member.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(String(member.id))}
                    className="flex w-full items-center justify-between gap-4 border-b border-border-subtle px-6 py-4 text-left transition-colors last:border-b-0 hover:bg-black/[0.03] sm:px-8"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-text-primary">
                        {member.display_name}
                      </p>
                      <p className="mt-0.5 truncate text-[13px] text-text-secondary">
                        {handle || "No chess username"} ·{" "}
                        {formatRelativeTime(member.last_activity_at || member.updated_at)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold",
                        status === "active" && "bg-emerald-500/10 text-emerald-700",
                        status === "inactive" && "bg-amber-500/10 text-amber-700",
                        status === "pending" && "bg-sky-500/10 text-sky-700",
                        status === "banned" && "bg-red-500/10 text-red-600"
                      )}
                    >
                      {statusLabel(status)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </AdminPanel>

      <AdminContentModal
        open={filterOpen}
        onOpenChange={setFilterOpen}
        title="Filter members"
        description="Show a subset of the community"
      >
        <div className="flex flex-col gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setFilter(option.value)
                setFilterOpen(false)
              }}
              className={cn(
                "rounded-2xl px-4 py-3.5 text-left text-sm font-semibold transition-colors",
                filter === option.value
                  ? "bg-accent-lime text-text-primary"
                  : "bg-bg-panel-light text-text-primary hover:bg-black/[0.04]"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </AdminContentModal>

      <AdminContentModal
        open={infoOpen}
        onOpenChange={setInfoOpen}
        title="Member records"
        description="How account status works"
      >
        <p className="text-sm leading-relaxed text-text-secondary">
          Banned members keep their historical tournament records. Status reflects the
          account state in the live database — not a demo roster.
        </p>
      </AdminContentModal>

      <AdminContentModal
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelectedId(null)}
        title={selected?.display_name ?? "Member"}
        description="Profile snapshot"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Status", value: statusLabel(selected.user_status) },
                { label: "Role", value: selected.role },
                { label: "Phone", value: selected.phone_number || "—" },
                {
                  label: "Chess",
                  value: chessHandle(selected)
                    ? `${chessHandle(selected)}${
                        selected.chess_elo != null ? ` · ${selected.chess_elo}` : ""
                      }`
                    : "—",
                },
              ].map((row) => (
                <div key={row.label} className="rounded-2xl bg-bg-panel-light px-4 py-3">
                  <p className="text-[12px] font-medium text-text-secondary">{row.label}</p>
                  <p className="mt-1 truncate text-sm font-semibold capitalize">{row.value}</p>
                </div>
              ))}
            </div>
            <Link
              href={`/admin/players/${selected.id}`}
              onClick={() => setSelectedId(null)}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-bg-panel-dark text-sm font-semibold text-white"
            >
              <User className="size-4" />
              Open full profile
            </Link>
          </div>
        )}
      </AdminContentModal>
    </AdminPageShell>
  )
}
