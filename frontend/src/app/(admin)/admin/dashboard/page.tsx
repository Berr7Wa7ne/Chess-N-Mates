"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Activity,
  AlertTriangle,
  Eye,
  KeyRound,
  Plus,
  Trophy,
  Users,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import {
  AdminContentModal,
  AdminIconAction,
  AdminIconRow,
  AdminPageHeader,
  AdminPageShell,
  AdminPanel,
  AdminPanelTitle,
} from "@/components/layout"
import { useAuth } from "@/src/hooks/useAuth"
import { useCompetitions } from "@/src/hooks/useCompetitions"
import { useDisputes } from "@/src/hooks/useDisputes"
import { useUsers } from "@/src/hooks/useUsers"
import { userService } from "@/src/services/user.service"
import { ApiError } from "@/src/types/api"

export default function AdminDashboardPage() {
  const { currentUser } = useAuth()
  const { data: competitions } = useCompetitions()
  const { data: members = [] } = useUsers()
  const disputesQuery = useDisputes()
  const disputes = Array.isArray(disputesQuery.data) ? disputesQuery.data : []

  const [activityOpen, setActivityOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  const activeCompetitions = useMemo(
    () => (competitions ?? []).filter((c) => c.competition_status === "active"),
    [competitions]
  )

  const openDisputes = disputes.filter((d) =>
    ["open", "under_review"].includes(d.dispute_status)
  ).length

  const activeMembers = members.filter(
    (m) => (m.user_status || "active") === "active"
  ).length

  const stats = [
    {
      label: "Members",
      value: members.length,
      hint: `${activeMembers} active`,
    },
    {
      label: "Competitions",
      value: competitions?.length ?? "—",
      hint: `${competitions?.filter((c) => c.competition_status === "completed").length ?? 0} done`,
    },
    {
      label: "Open disputes",
      value: openDisputes,
      hint: "Awaiting review",
    },
  ]

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser?.id) return
    if (!currentPassword || !newPassword) {
      toast.error("Enter current and new password")
      return
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    setChangingPassword(true)
    try {
      await userService.changePassword(currentUser.id, {
        current_password: currentPassword,
        new_password: newPassword,
      })
      toast.success("Password updated")
      setPasswordOpen(false)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to change password")
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <AdminPageShell>
      <div className="flex items-start justify-between gap-4">
        <AdminPageHeader
          title="Dashboard"
          description="Community pulse — open details from the icons"
        />
        <AdminIconRow>
          <AdminIconAction
            icon={Activity}
            label="Recent activity"
            onClick={() => setActivityOpen(true)}
          />
          <AdminIconAction
            icon={Zap}
            label="Quick actions"
            onClick={() => setActionsOpen(true)}
            accent
          />
        </AdminIconRow>
      </div>

      <AdminPanel dark>
        <AdminPanelTitle
          title="At a glance"
          description="Live counts from your workspace"
        />
        <div className="mt-2 grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/5 bg-bg-stat-tile px-3 py-4 text-center"
            >
              <p className="tabular-nums text-3xl font-extrabold tracking-tight text-accent-lime">
                {stat.value}
              </p>
              <p className="mt-1 text-[12px] font-medium text-white/55">{stat.label}</p>
              <p className="mt-0.5 text-[11px] text-white/35">{stat.hint}</p>
            </div>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelTitle
          title="Live tournaments"
          description={
            activeCompetitions.length
              ? `${activeCompetitions.length} running concurrently`
              : "No active competitions"
          }
          action={
            <AdminIconAction
              icon={Trophy}
              label="All competitions"
              href="/admin/competitions"
            />
          }
        />
        {activeCompetitions.length ? (
          <ul className="space-y-2">
            {activeCompetitions.map((competition) => (
              <li key={competition.id}>
                <Link
                  href={`/admin/competitions/${competition.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-bg-panel-light px-4 py-3 transition-colors hover:bg-black/[0.03]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold">{competition.name}</p>
                    <p className="mt-0.5 text-[12px] text-text-secondary">
                      Round {competition.current_round} of {competition.rounds} ·{" "}
                      {competition.participant_count ?? 0} players
                      {competition.is_featured ? " · Featured" : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-text-secondary">
                    Manage
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-secondary">No active tournaments right now.</p>
        )}
      </AdminPanel>

      <AdminPanel>
        <AdminPanelTitle title="Shortcuts" />
        <AdminIconRow>
          <AdminIconAction icon={Plus} label="New competition" href="/admin/competitions/new" accent />
          <AdminIconAction icon={Users} label="Members" href="/admin/members" />
          <AdminIconAction icon={AlertTriangle} label="Disputes" href="/admin/disputes" />
          <AdminIconAction icon={Eye} label="Leaderboard" href="/admin/leaderboard" />
          <AdminIconAction
            icon={KeyRound}
            label="Change password"
            onClick={() => setPasswordOpen(true)}
          />
        </AdminIconRow>
      </AdminPanel>

      <AdminContentModal
        open={activityOpen}
        onOpenChange={setActivityOpen}
        title="Recent activity"
        description="Latest community updates"
      >
        <ul className="space-y-4">
          {[
            {
              id: 1,
              title: "Open disputes",
              body: `${openDisputes} awaiting admin review`,
            },
            {
              id: 2,
              title: "Competitions",
              body: `${competitions?.length ?? 0} total on the platform`,
            },
            {
              id: 3,
              title: "Members",
              body: `${members.length} community members registered`,
            },
          ].map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-border-subtle bg-bg-panel-light px-4 py-3"
            >
              <p className="font-semibold text-text-primary">{item.title}</p>
              <p className="mt-1 text-sm text-text-secondary">{item.body}</p>
            </li>
          ))}
        </ul>
      </AdminContentModal>

      <AdminContentModal
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        title="Quick actions"
        description="Core admin workflow"
      >
        <div className="flex flex-col gap-2">
          {[
            { href: "/admin/competitions/new", label: "Create competition", icon: Plus },
            { href: "/admin/competitions", label: "Manage competitions", icon: Trophy },
            { href: "/admin/members", label: "View members", icon: Users },
            { href: "/admin/disputes", label: "Review disputes", icon: AlertTriangle },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              onClick={() => setActionsOpen(false)}
              className="flex items-center gap-3 rounded-2xl bg-bg-panel-light px-4 py-3.5 text-sm font-semibold text-text-primary transition-colors hover:bg-black/[0.04]"
            >
              <action.icon className="size-4 text-text-secondary" />
              {action.label}
            </Link>
          ))}
        </div>
      </AdminContentModal>
      <AdminContentModal
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        title="Change password"
        description="Update your admin account password"
      >
        <form onSubmit={handleChangePassword} className="space-y-3">
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="h-11 w-full rounded-xl border border-border-subtle bg-bg-shell px-3 text-sm outline-none"
          />
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="h-11 w-full rounded-xl border border-border-subtle bg-bg-shell px-3 text-sm outline-none"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-11 w-full rounded-xl border border-border-subtle bg-bg-shell px-3 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={changingPassword}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-bg-panel-dark text-sm font-semibold text-white disabled:opacity-60"
          >
            {changingPassword ? "Updating…" : "Update password"}
          </button>
        </form>
      </AdminContentModal>
    </AdminPageShell>
  )
}
