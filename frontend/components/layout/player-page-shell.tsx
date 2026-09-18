import { cn } from "@/lib/utils"

/** Centered compact column used by profile / leaderboard / tournament / matches */
export function PlayerPageShell({
  children,
  className,
  wide,
  full,
}: {
  children: React.ReactNode
  className?: string
  /** Slightly wider for tables */
  wide?: boolean
  /** No max-width cap (admin dashboard full-width mode) */
  full?: boolean
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-5 pb-6",
        full ? "max-w-none" : wide ? "max-w-3xl" : "max-w-2xl",
        className
      )}
    >
      {children}
    </div>
  )
}

export function PlayerPageHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">{title}</h1>
      {description ? (
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      ) : null}
    </div>
  )
}

export function PlayerPanel({
  children,
  className,
  dark,
}: {
  children: React.ReactNode
  className?: string
  dark?: boolean
}) {
  return (
    <section
      className={cn(
        "rounded-[20px] px-4 py-5 sm:px-8",
        dark ? "bg-bg-panel-dark text-text-primary-inverse" : "bg-bg-panel-light text-text-primary",
        className
      )}
    >
      {children}
    </section>
  )
}

export function PlayerPanelTitle({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-inherit">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-text-secondary dark:text-white/50">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}
