"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  PlayerPageHeader,
  PlayerPageShell,
  PlayerPanel,
  PlayerPanelTitle,
} from "./player-page-shell"

/** Same centered column as player pages */
export function AdminPageShell({
  children,
  className,
  wide,
}: {
  children: React.ReactNode
  className?: string
  wide?: boolean
}) {
  return (
    <PlayerPageShell className={className} wide={wide}>
      {children}
    </PlayerPageShell>
  )
}

export const AdminPageHeader = PlayerPageHeader
export const AdminPanel = PlayerPanel
export const AdminPanelTitle = PlayerPanelTitle

/** Icon button that opens denser content in a modal instead of crowding the page */
export function AdminIconAction({
  icon: Icon,
  label,
  onClick,
  href,
  active,
  accent,
}: {
  icon: LucideIcon
  label: string
  onClick?: () => void
  href?: string
  active?: boolean
  accent?: boolean
}) {
  const className = cn(
    "flex size-11 items-center justify-center rounded-xl transition-all duration-150",
    accent
      ? "bg-accent-lime text-text-primary hover:brightness-95"
      : active
        ? "bg-bg-panel-dark text-white"
        : "bg-bg-panel-light text-text-primary hover:bg-black/[0.04]"
  )

  if (href) {
    return (
      <Link href={href} aria-label={label} title={label} className={className}>
        <Icon className="size-5" strokeWidth={1.75} />
      </Link>
    )
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={className}
    >
      <Icon className="size-5" strokeWidth={1.75} />
    </button>
  )
}

export function AdminIconRow({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {children}
    </div>
  )
}

export function AdminContentModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "gap-0 overflow-hidden rounded-[24px] border-0 bg-bg-shell p-0 text-text-primary shadow-2xl",
          wide ? "sm:max-w-3xl" : "sm:max-w-xl"
        )}
      >
        <DialogHeader className="flex flex-row items-start justify-between gap-4 border-b border-border-subtle px-6 py-5 sm:px-7">
          <div className="min-w-0 space-y-1 text-left">
            <DialogTitle className="text-xl font-bold tracking-tight">
              {title}
            </DialogTitle>
            {description ? (
              <DialogDescription className="text-sm text-text-secondary">
                {description}
              </DialogDescription>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-black/[0.04] hover:text-text-primary"
          >
            <X className="size-4" />
          </button>
        </DialogHeader>
        <div className="player-main max-h-[min(70vh,640px)] overflow-y-auto px-6 py-5 sm:px-7">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}
