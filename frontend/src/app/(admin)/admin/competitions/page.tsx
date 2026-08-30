"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Filter, Loader2, MoreHorizontal, Plus, Search, Trophy } from "lucide-react"
import { toast } from "sonner"
import {
  AdminContentModal,
  AdminIconAction,
  AdminIconRow,
  AdminPageHeader,
  AdminPageShell,
  AdminPanel,
} from "@/components/layout"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  CompetitionStatusBadge,
  TournamentTypeBadge,
} from "@/src/components/competitions/competition-badges"
import { useCompetitions, useDeleteCompetition, useOpenRegistration } from "@/src/hooks/useCompetitions"
import { ApiError } from "@/src/types/api"
import type { CompetitionStatus, TournamentType } from "@/src/types/competition"
import { cn } from "@/lib/utils"

export default function AdminCompetitionsPage() {
  const [nameFilter, setNameFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | TournamentType>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | CompetitionStatus>("all")
  const [filterOpen, setFilterOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [competitionToDelete, setCompetitionToDelete] = useState<{
    id: string
    name: string
    status: CompetitionStatus
  } | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")

  const listParams = useMemo(() => {
    const params: { status?: CompetitionStatus; type?: TournamentType } = {}
    if (statusFilter !== "all") params.status = statusFilter
    if (typeFilter !== "all") params.type = typeFilter
    return params
  }, [statusFilter, typeFilter])

  const { data: competitions, isLoading, isError, error, refetch } = useCompetitions(listParams)

  const filteredCompetitions = useMemo(() => {
    if (!competitions) return []
    return competitions.filter((c) =>
      c.name.toLowerCase().includes(nameFilter.toLowerCase())
    )
  }, [competitions, nameFilter])

  const openRegistrationMutation = useOpenRegistration()
  const deleteMutation = useDeleteCompetition()

  const activeCompetitions = filteredCompetitions.filter(
    (c) => c.competition_status === "active"
  )

  function handleDeleteClick(competition: {
    id: string
    name: string
    competition_status: CompetitionStatus
  }) {
    setCompetitionToDelete({
      id: competition.id,
      name: competition.name,
      status: competition.competition_status,
    })
    setDeleteConfirmText("")
    setDeleteDialogOpen(true)
  }

  async function handleConfirmDelete() {
    if (!competitionToDelete) return
    try {
      await deleteMutation.mutateAsync(competitionToDelete.id)
      toast.success(`"${competitionToDelete.name}" deleted successfully`)
      setDeleteDialogOpen(false)
      setCompetitionToDelete(null)
      setDeleteConfirmText("")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete competition")
    }
  }

  async function handleOpenRegistration(id: string) {
    try {
      await openRegistrationMutation.mutateAsync(id)
      toast.success("Registration opened successfully")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to open registration")
    }
  }

  const requiresDeleteTyping =
    competitionToDelete && ["active", "completed"].includes(competitionToDelete.status)

  const filtersActive =
    typeFilter !== "all" || statusFilter !== "all" || Boolean(nameFilter.trim())

  return (
    <AdminPageShell>
      <div className="flex items-start justify-between gap-4">
        <AdminPageHeader
          title="Competitions"
          description="Create, filter, and manage tournaments"
        />
        <AdminIconRow>
          <AdminIconAction
            icon={Search}
            label="Search"
            onClick={() => setSearchOpen(true)}
            active={Boolean(nameFilter.trim())}
          />
          <AdminIconAction
            icon={Filter}
            label="Filters"
            onClick={() => setFilterOpen(true)}
            active={filtersActive}
          />
          <AdminIconAction
            icon={Plus}
            label="Add competition"
            href="/admin/competitions/new"
            accent
          />
        </AdminIconRow>
      </div>

      {activeCompetitions.length > 0 && (
        <AdminPanel dark>
          <p className="text-[12px] font-medium text-white/45">
            Live now · {activeCompetitions.length} concurrent
          </p>
          <ul className="mt-3 space-y-2">
            {activeCompetitions.map((competition) => (
              <li key={competition.id}>
                <Link
                  href={`/admin/competitions/${competition.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-bg-stat-tile px-4 py-3 transition-colors hover:border-accent-lime/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {competition.name}
                      {competition.is_featured ? (
                        <span className="ml-2 text-[11px] font-bold text-accent-lime">
                          Featured
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[12px] text-white/50">
                      Round {competition.current_round}/{competition.rounds} ·{" "}
                      {competition.participant_count ?? 0} players
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-accent-lime px-3 py-1.5 text-xs font-bold text-text-primary">
                    Manage
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </AdminPanel>
      )}

      <AdminPanel className="px-0 py-0 sm:px-0">
        {isLoading && (
          <p className="px-6 py-10 text-center text-sm text-text-secondary sm:px-8">
            Loading competitions…
          </p>
        )}
        {isError && (
          <div className="flex flex-col items-center gap-3 px-6 py-10 sm:px-8">
            <p className="text-sm text-red-600">
              {error instanceof ApiError ? error.message : "Failed to load competitions"}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-xl bg-bg-panel-dark px-4 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          </div>
        )}
        {!isLoading && !isError && filteredCompetitions.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-6 py-12 sm:px-8">
            <Trophy className="size-8 text-text-secondary/40" />
            <p className="text-sm font-medium text-text-secondary">No competitions yet</p>
            <Link
              href="/admin/competitions/new"
              className="rounded-xl bg-accent-lime px-4 py-2.5 text-sm font-bold text-text-primary"
            >
              Create competition
            </Link>
          </div>
        )}
        {!isLoading &&
          !isError &&
          filteredCompetitions.map((competition) => (
            <div
              key={competition.id}
              className="flex items-center justify-between gap-3 border-b border-border-subtle px-6 py-4 last:border-b-0 sm:px-8"
            >
              <Link
                href={`/admin/competitions/${competition.id}`}
                className="min-w-0 flex-1"
              >
                <p className="truncate text-[15px] font-semibold text-text-primary">
                  {competition.name}
                  {competition.is_featured ? (
                    <span className="ml-2 align-middle text-[11px] font-bold text-amber-600">
                      Featured
                    </span>
                  ) : null}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <TournamentTypeBadge type={competition.tournament_type} />
                  <CompetitionStatusBadge status={competition.competition_status} />
                  <span className="text-[12px] text-text-secondary">
                    {competition.participant_count ?? 0}/{competition.max_participants} · R
                    {competition.current_round}/{competition.rounds}
                  </span>
                </div>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Actions for ${competition.name}`}
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl text-text-secondary hover:bg-black/[0.04] hover:text-text-primary"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-xl">
                  <DropdownMenuItem asChild>
                    <Link href={`/admin/competitions/${competition.id}`}>View</Link>
                  </DropdownMenuItem>
                  {(competition.competition_status === "active" ||
                    competition.competition_status === "completed") && (
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/competitions/${competition.id}/matches`}>
                        Open matches
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {competition.competition_status === "draft" && (
                    <DropdownMenuItem
                      className="gap-2 text-emerald-600"
                      onClick={() => handleOpenRegistration(competition.id)}
                      disabled={openRegistrationMutation.isPending}
                    >
                      {openRegistrationMutation.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : null}
                      Open registration
                    </DropdownMenuItem>
                  )}
                  {!["completed", "active"].includes(competition.competition_status) && (
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/competitions/edit/${competition.id}`}>Edit</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => handleDeleteClick(competition)}
                    disabled={deleteMutation.isPending}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
      </AdminPanel>

      <AdminContentModal
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Search competitions"
      >
        <Input
          autoFocus
          placeholder="Search by name…"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          className="h-11 rounded-xl"
        />
        <button
          type="button"
          className="mt-4 h-11 w-full rounded-xl bg-bg-panel-dark text-sm font-semibold text-white"
          onClick={() => setSearchOpen(false)}
        >
          Done
        </button>
      </AdminContentModal>

      <AdminContentModal
        open={filterOpen}
        onOpenChange={setFilterOpen}
        title="Filters"
        description="Narrow the competition list"
      >
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-text-secondary">Type</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All"],
                  ["swiss", "Swiss"],
                  ["knockout", "Knockout"],
                  ["round_robin", "Round robin"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTypeFilter(value)}
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm font-semibold",
                    typeFilter === value
                      ? "bg-accent-lime text-text-primary"
                      : "bg-bg-panel-light text-text-secondary"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-medium text-text-secondary">Status</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All"],
                  ["draft", "Draft"],
                  ["open_registration", "Open reg"],
                  ["active", "Active"],
                  ["completed", "Completed"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm font-semibold",
                    statusFilter === value
                      ? "bg-accent-lime text-text-primary"
                      : "bg-bg-panel-light text-text-secondary"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="h-11 w-full rounded-xl bg-bg-panel-dark text-sm font-semibold text-white"
            onClick={() => setFilterOpen(false)}
          >
            Apply
          </button>
        </div>
      </AdminContentModal>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialogOpen(false)
            setCompetitionToDelete(null)
            setDeleteConfirmText("")
          }
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete competition</DialogTitle>
            <DialogDescription>
              {requiresDeleteTyping ? (
                <>
                  This competition is <strong>{competitionToDelete?.status}</strong>. Type{" "}
                  <strong className="text-destructive">DELETE</strong> to confirm.
                </>
              ) : (
                <>
                  Delete <strong>&quot;{competitionToDelete?.name}&quot;</strong>? This cannot be
                  undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {requiresDeleteTyping && (
            <div className="space-y-2 py-2">
              <Label htmlFor="deleteConfirm">Type DELETE to confirm</Label>
              <Input
                id="deleteConfirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="h-11"
              />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setCompetitionToDelete(null)
                setDeleteConfirmText("")
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={
                deleteMutation.isPending ||
                (requiresDeleteTyping ? deleteConfirmText !== "DELETE" : false)
              }
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  )
}
