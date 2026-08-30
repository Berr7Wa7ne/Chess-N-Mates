"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Filter } from "lucide-react"
import {
  AdminContentModal,
  AdminIconAction,
  AdminIconRow,
  AdminPageHeader,
  AdminPageShell,
  AdminPanel,
} from "@/components/layout"
import { useDisputes } from "@/src/hooks/useDisputes"
import type { Dispute, DisputeStatus } from "@/src/types/dispute"
import { cn } from "@/lib/utils"

type FilterType = "all" | DisputeStatus

const filterOptions: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "under_review", label: "Under review" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
]

function statusStyles(status: DisputeStatus) {
  switch (status) {
    case "open":
      return "bg-amber-500/10 text-amber-700"
    case "under_review":
      return "bg-blue-500/10 text-blue-700"
    case "resolved":
      return "bg-emerald-500/10 text-emerald-700"
    case "rejected":
      return "bg-black/5 text-text-secondary"
    default:
      return "bg-black/5 text-text-secondary"
  }
}

export default function DisputesPage() {
  const router = useRouter()
  const disputesQuery = useDisputes()
  const disputes: Dispute[] = Array.isArray(disputesQuery.data) ? disputesQuery.data : []
  const [filter, setFilter] = useState<FilterType>("all")
  const [filterOpen, setFilterOpen] = useState(false)

  const filtered = useMemo(
    () =>
      disputes.filter((d) => (filter === "all" ? true : d.dispute_status === filter)),
    [disputes, filter]
  )

  return (
    <AdminPageShell>
      <div className="flex items-start justify-between gap-4">
        <AdminPageHeader
          title="Disputes"
          description="Tap a row to review — keep the list lean"
        />
        <AdminIconRow>
          <AdminIconAction
            icon={Filter}
            label="Filter disputes"
            onClick={() => setFilterOpen(true)}
            active={filter !== "all"}
          />
        </AdminIconRow>
      </div>

      <AdminPanel className="px-0 py-0 sm:px-0">
        {disputesQuery.isLoading ? (
          <p className="px-6 py-10 text-center text-sm text-text-secondary sm:px-8">
            Loading disputes…
          </p>
        ) : disputesQuery.isError ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 sm:px-8">
            <AlertTriangle className="size-8 text-red-500/40" />
            <p className="text-sm text-red-600">Failed to load disputes</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 sm:px-8">
            <AlertTriangle className="size-8 text-text-secondary/30" />
            <p className="text-sm font-medium text-text-secondary">No disputes</p>
            <p className="text-xs text-text-secondary/70">
              They appear here when players flag an issue
            </p>
          </div>
        ) : (
          <ul>
            {filtered.map((dispute) => (
              <li key={dispute.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/admin/disputes/${dispute.id}`)}
                  className="flex w-full items-center justify-between gap-4 border-b border-border-subtle px-6 py-4 text-left transition-colors last:border-b-0 hover:bg-black/[0.03] sm:px-8"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-text-primary">
                      {dispute.competition?.name || "Dispute"}
                      {dispute.match?.round_number
                        ? ` · R${dispute.match.round_number}`
                        : ""}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] text-text-secondary">
                      {dispute.raised_by?.display_name || "—"} vs{" "}
                      {dispute.opponent?.display_name || "—"} ·{" "}
                      {dispute.category?.replace(/_/g, " ") || "issue"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold capitalize",
                      statusStyles(dispute.dispute_status)
                    )}
                  >
                    {dispute.dispute_status.replace(/_/g, " ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>

      <AdminContentModal
        open={filterOpen}
        onOpenChange={setFilterOpen}
        title="Filter disputes"
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
    </AdminPageShell>
  )
}
