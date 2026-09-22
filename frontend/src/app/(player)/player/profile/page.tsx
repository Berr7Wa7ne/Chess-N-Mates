"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { LogOut, Pencil, Check, X } from "lucide-react"
import { toast } from "sonner"
import {
  PlayerPageHeader,
  PlayerPageShell,
  PlayerPanel,
} from "@/components/layout/player-page-shell"
import { useAuth } from "@/src/hooks/useAuth"
import { useCompetitions, useCompetitionStandings } from "@/src/hooks/useCompetitions"
import { useCommunityLeaderboard } from "@/src/hooks/useCommunityLeaderboard"
import { useUserRegistrations } from "@/src/hooks/useParticipants"
import { queryKeys } from "@/src/lib/query-keys"
import { userService } from "@/src/services/user.service"
import { ApiError } from "@/src/types/api"
import { cn } from "@/lib/utils"

function EditableDetailRow({
  label,
  value,
  editable = false,
  draft,
  onDraftChange,
  editing,
  onStartEdit,
  onSave,
  onCancel,
  saving,
  placeholder,
}: {
  label: string
  value?: string | null
  editable?: boolean
  draft?: string
  onDraftChange?: (value: string) => void
  editing?: boolean
  onStartEdit?: () => void
  onSave?: () => void
  onCancel?: () => void
  saving?: boolean
  placeholder?: string
}) {
  const display = value?.trim() ? value : "—"

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-subtle py-4 last:border-b-0">
      <span className="shrink-0 text-[13px] font-medium text-text-secondary">{label}</span>

      {editable && editing ? (
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <input
            value={draft ?? ""}
            onChange={(e) => onDraftChange?.(e.target.value)}
            placeholder={placeholder}
            disabled={saving}
            autoFocus
            className="h-9 w-full max-w-[220px] rounded-lg border border-border-subtle bg-bg-shell px-3 text-right text-[15px] font-semibold text-text-primary outline-none focus:border-text-primary/30"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave?.()
              if (e.key === "Escape") onCancel?.()
            }}
          />
          <button
            type="button"
            aria-label={`Save ${label}`}
            disabled={saving}
            onClick={onSave}
            className="flex size-11 items-center justify-center rounded-lg bg-accent-gold text-text-primary disabled:opacity-50"
          >
            <Check className="size-4" />
          </button>
          <button
            type="button"
            aria-label={`Cancel ${label}`}
            disabled={saving}
            onClick={onCancel}
            className="flex size-11 items-center justify-center rounded-lg border border-border-subtle text-text-secondary hover:text-text-primary disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "min-w-0 truncate text-right text-[15px] font-semibold text-text-primary",
              !value?.trim() && "font-medium text-text-secondary"
            )}
          >
            {display}
          </span>
          {editable && (
            <button
              type="button"
              aria-label={`Edit ${label}`}
              onClick={onStartEdit}
              className="flex size-11 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-black/[0.04] hover:text-text-primary"
            >
              <Pencil className="size-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

type EditableField = "display_name" | "chess_username" | "chess_com_username" | "lichess_username"

export default function PlayerProfilePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { currentUser, logout, setUser } = useAuth()
  const { data: competitions } = useCompetitions()
  const { data: registrationIds } = useUserRegistrations(currentUser?.id)

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: queryKeys.users.detail(currentUser?.id ?? ""),
    queryFn: async () => {
      const response = await userService.getUser(currentUser!.id)
      return response.data
    },
    enabled: Boolean(currentUser?.id),
    staleTime: 30_000,
  })

  useEffect(() => {
    if (profile) setUser(profile)
  }, [profile, setUser])

  const user = profile ?? currentUser

  const [editingField, setEditingField] = useState<EditableField | null>(null)
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  const lastTournament = useMemo(() => {
    if (!competitions?.length || !registrationIds?.length) return null
    const idSet = new Set(registrationIds.map(String))
    const joined = competitions
      .filter((c) => idSet.has(String(c.id)))
      .slice()
      .sort((a, b) => {
        const aTime = new Date(a.end_date || a.start_date || a.updated_at || 0).getTime()
        const bTime = new Date(b.end_date || b.start_date || b.updated_at || 0).getTime()
        return bTime - aTime
      })

    return (
      joined.find((c) => c.competition_status === "completed") ||
      joined.find((c) => c.competition_status === "active") ||
      joined[0] ||
      null
    )
  }, [competitions, registrationIds])

  const standingsQuery = useCompetitionStandings(
    lastTournament?.id ?? "",
    Boolean(lastTournament?.id)
  )

  const lastStanding = useMemo(() => {
    if (!user || !standingsQuery.data?.length) return null
    const byId = standingsQuery.data.find((row) => String(row.user_id) === String(user.id))
    if (byId) return byId
    const handles = [
      user.chess_com_username,
      user.chess_username,
      user.lichess_username,
      user.display_name,
    ]
      .map((v) => v?.trim().toLowerCase())
      .filter(Boolean)
    return (
      standingsQuery.data.find((row) => {
        const handle = row.chess_username?.trim().toLowerCase()
        const name = row.display_name?.trim().toLowerCase()
        return handles.some((h) => h === handle || h === name)
      }) ?? null
    )
  }, [user, standingsQuery.data])

  const { eloByUserId } = useCommunityLeaderboard()
  const communityElo = user?.id ? (eloByUserId[String(user.id)] ?? null) : null

  const name = user?.display_name || ""
  const username = user?.chess_username || ""
  const phone = user?.phone_number || user?.whatsapp_phone || ""
  const chessCom = user?.chess_com_username || ""
  const lichess = user?.lichess_username || ""

  function startEdit(field: EditableField, current: string) {
    setEditingField(field)
    setDraft(current)
  }

  function cancelEdit() {
    setEditingField(null)
    setDraft("")
  }

  async function saveField(field: EditableField) {
    if (!user?.id) return
    const trimmed = draft.trim()
    setSaving(true)
    try {
      const payload =
        field === "display_name"
          ? { display_name: trimmed || user.display_name }
          : field === "chess_username"
            ? { chess_username: trimmed || null }
            : field === "chess_com_username"
              ? { chess_com_username: trimmed || null }
              : { lichess_username: trimmed || null }

      const response = await userService.updateUser(user.id, payload)
      const updated = response.data
      if (updated) {
        setUser(updated)
        queryClient.setQueryData(queryKeys.users.detail(user.id), updated)
        queryClient.invalidateQueries({ queryKey: queryKeys.competitions.all })
      }
      toast.success("Profile updated")
      cancelEdit()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  function handleLogout() {
    logout()
    router.push("/login")
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) return

    if (!currentPassword || !newPassword) {
      toast.error("Enter your current and new password")
      return
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters")
      return
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match")
      return
    }

    setChangingPassword(true)
    try {
      await userService.changePassword(user.id, {
        current_password: currentPassword,
        new_password: newPassword,
      })
      toast.success("Password updated")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmNewPassword("")
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to change password")
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <PlayerPageShell>
      <PlayerPageHeader
        title="Profile"
        description="Edit usernames anytime — your tournament record stays on this account"
      />

      <PlayerPanel className="py-2">
        {profileLoading && !user ? (
          <p className="py-6 text-sm text-text-secondary">Loading profile…</p>
        ) : (
          <>
            <EditableDetailRow
              label="Name"
              value={name}
              editable
              editing={editingField === "display_name"}
              draft={draft}
              onDraftChange={setDraft}
              onStartEdit={() => startEdit("display_name", name)}
              onSave={() => saveField("display_name")}
              onCancel={cancelEdit}
              saving={saving}
              placeholder="Display name"
            />
            <EditableDetailRow
              label="Username"
              value={username}
              editable
              editing={editingField === "chess_username"}
              draft={draft}
              onDraftChange={setDraft}
              onStartEdit={() => startEdit("chess_username", username)}
              onSave={() => saveField("chess_username")}
              onCancel={cancelEdit}
              saving={saving}
              placeholder="Community username"
            />
            <EditableDetailRow label="Phone number" value={phone} />
            <EditableDetailRow
              label="Chess.com username"
              value={chessCom}
              editable
              editing={editingField === "chess_com_username"}
              draft={draft}
              onDraftChange={setDraft}
              onStartEdit={() => startEdit("chess_com_username", chessCom)}
              onSave={() => saveField("chess_com_username")}
              onCancel={cancelEdit}
              saving={saving}
              placeholder="Chess.com handle"
            />
            <EditableDetailRow
              label="Lichess username"
              value={lichess}
              editable
              editing={editingField === "lichess_username"}
              draft={draft}
              onDraftChange={setDraft}
              onStartEdit={() => startEdit("lichess_username", lichess)}
              onSave={() => saveField("lichess_username")}
              onCancel={cancelEdit}
              saving={saving}
              placeholder="Lichess handle"
            />
          </>
        )}
      </PlayerPanel>

      <PlayerPanel>
        <p className="text-[15px] font-semibold text-text-primary">Change password</p>
        <p className="mt-1 text-sm text-text-secondary">
          Leave the default password behind — use something only you know.
        </p>
        <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            className="h-11 w-full rounded-xl border border-border-subtle bg-bg-shell px-3 text-sm font-medium outline-none focus:border-text-primary/30"
          />
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            className="h-11 w-full rounded-xl border border-border-subtle bg-bg-shell px-3 text-sm font-medium outline-none focus:border-text-primary/30"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            autoComplete="new-password"
            className="h-11 w-full rounded-xl border border-border-subtle bg-bg-shell px-3 text-sm font-medium outline-none focus:border-text-primary/30"
          />
          <button
            type="submit"
            disabled={changingPassword}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-bg-panel-dark text-sm font-semibold text-white disabled:opacity-60"
          >
            {changingPassword ? "Updating…" : "Update password"}
          </button>
        </form>
      </PlayerPanel>

      <PlayerPanel dark>
        <p className="text-[13px] font-medium text-white/50">Community ELO</p>
        <p className="mt-2 tabular-nums text-5xl font-extrabold tracking-tight text-accent-gold">
          {communityElo ?? "—"}
        </p>
        <p className="mt-2 text-sm text-white/55">
          {lastTournament
            ? `Last tournament performance · ${lastTournament.name}`
            : "Last tournament performance rating"}
        </p>

        <div className="scrollbar-none mt-6 max-h-48 overflow-y-auto border-t border-white/10 pt-4">
          {standingsQuery.isLoading ? (
            <p className="text-sm text-white/40">Loading tournament details…</p>
          ) : lastStanding ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-white/45">Rank</span>
                <span className="font-semibold text-white">
                  #{lastStanding.rank_display || lastStanding.rank}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-white/45">Points</span>
                <span className="font-semibold text-white">{lastStanding.points}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-white/45">Record</span>
                <span className="font-semibold text-white">
                  {lastStanding.wins}W · {lastStanding.draws}D · {lastStanding.losses}L
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-white/45">Played</span>
                <span className="font-semibold text-white">{lastStanding.played}</span>
              </div>
              {typeof lastStanding.buchholz === "number" && (
                <div className="flex justify-between gap-4">
                  <span className="text-white/45">Buchholz</span>
                  <span className="font-semibold text-white">{lastStanding.buchholz}</span>
                </div>
              )}
              {typeof lastStanding.sonneborn_berger === "number" && (
                <div className="flex justify-between gap-4">
                  <span className="text-white/45">Sonneborn–Berger</span>
                  <span className="font-semibold text-white">
                    {lastStanding.sonneborn_berger}
                  </span>
                </div>
              )}
              {lastStanding.participant_status && (
                <div className="flex justify-between gap-4">
                  <span className="text-white/45">Status</span>
                  <span className="font-semibold capitalize text-white">
                    {lastStanding.participant_status.replaceAll("_", " ")}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-white/40">No tournament performance on record yet.</p>
          )}
        </div>
      </PlayerPanel>

      <button
        type="button"
        onClick={handleLogout}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border-subtle bg-bg-panel-light text-sm font-semibold text-red-600 transition-colors hover:bg-black/[0.03]"
      >
        <LogOut className="size-4" />
        Sign out
      </button>
    </PlayerPageShell>
  )
}
