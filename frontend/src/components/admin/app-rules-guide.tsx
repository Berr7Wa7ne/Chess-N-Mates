'use client'

import { useState } from 'react'
import {
  BookOpen,
  Calculator,
  Crown,
  Gauge,
  Layers,
  Medal,
  RefreshCw,
  Swords,
  Timer,
  Trophy,
  Users,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const SECTIONS = [
  {
    id: 'scoring',
    title: 'Match points (club scoring)',
    icon: Calculator,
    body: (
      <>
        <p>Every completed game awards points like this:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>Win = 2</strong> points
          </li>
          <li>
            <strong>Draw = 1</strong> point each
          </li>
          <li>
            <strong>Loss = 0</strong>
          </li>
          <li>
            <strong>Bye = 2</strong> (odd number of players — that player sits out and still gets 2)
          </li>
        </ul>
        <p className="mt-3">
          <strong>Absence:</strong> if one player does not play, the other gets a win (2 points) and the
          absentee gets an absence mark (0 points). If <em>both</em> are absent, neither scores.
        </p>
      </>
    ),
  },
  {
    id: 'formats',
    title: 'Tournament formats',
    icon: Trophy,
    body: (
      <>
        <p className="font-medium">Swiss</p>
        <p className="mt-1 text-muted-foreground">
          New pairings each round. Players with similar scores meet; the app tries to avoid rematches
          and balance who has White. Best for larger fields and same-day events. You choose how many
          rounds when creating the tournament.
        </p>
        <p className="mt-3 font-medium">Round robin</p>
        <p className="mt-1 text-muted-foreground">
          Everyone plays everyone (all rounds are created when you Start). Single game or double game
          (two legs, colors reversed). Advance Round moves the “live” round forward and opens its
          play window.
        </p>
        <p className="mt-3 font-medium">Knockout</p>
        <p className="mt-1 text-muted-foreground">
          Single elimination. Winners move on; losers are eliminated. Byes may pad the bracket to a
          power of two. A draw does not advance a player — the match needs a decisive result (or
          admin decision).
        </p>
      </>
    ),
  },
  {
    id: 'lifecycle',
    title: 'How a tournament runs',
    icon: Layers,
    body: (
      <>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Create as <strong>Draft</strong>, open registration, players join.
          </li>
          <li>
            <strong>Start</strong> when ready (≥ 2 players). Status becomes Active; Round 1 pairings
            appear.
          </li>
          <li>
            Players play on Chess.com (if that is the platform). You score manually or use{' '}
            <strong>Compute Chess.com</strong>.
          </li>
          <li>
            When the current round is fully scored, <strong>Advance Round</strong> (or auto-advance
            after a successful compute) opens the next round.
          </li>
          <li>
            After the last round (or last knockout winner), the tournament is{' '}
            <strong>Completed</strong>.
          </li>
        </ol>
        <p className="mt-3">
          Several tournaments can be <strong>Active at the same time</strong>. The site is built for
          multiple concurrent events — not a single “current” tournament.
        </p>
      </>
    ),
  },
  {
    id: 'standings',
    title: 'Standings & tiebreaks',
    icon: Medal,
    body: (
      <>
        <p>Standings rebuild from completed matches (not only the score column on the player row).</p>
        <p className="mt-3 font-medium">Swiss order</p>
        <p className="text-muted-foreground">
          Points → Buchholz → Buchholz Cut-1 → Sonneborn-Berger → Wins → Head-to-head → In-app Elo →
          Name
        </p>
        <p className="mt-3 font-medium">Round robin order</p>
        <p className="text-muted-foreground">
          Points → Wins → Fewest losses → Fewest absences → Head-to-head → Sonneborn-Berger → Name
        </p>
        <p className="mt-3 font-medium">Knockout order</p>
        <p className="text-muted-foreground">
          Furthest round reached → Still active beats eliminated → Points → Wins → Head-to-head →
          Elo → Name
        </p>
        <p className="mt-3 text-muted-foreground">
          <strong>Win%</strong> on the standings table is an estimate of who is likeliest to win{' '}
          <em>this</em> tournament (ratings, head-to-head, and remaining fixtures) — not a guarantee.
        </p>
      </>
    ),
  },
  {
    id: 'elo',
    title: 'In-app Elo vs Chess.com ratings',
    icon: Gauge,
    body: (
      <>
        <p>
          <strong>In-app Elo</strong> is a number stored on each member profile (used for pairing
          order, some tiebreaks, registration Elo gates, and odds). It is{' '}
          <em>not</em> automatically recalculated when club matches are scored.
        </p>
        <p className="mt-3">
          Typical defaults: about <strong>1200</strong> when someone registers a Chess.com account in
          the app; if missing, many features fall back to <strong>1000</strong>.
        </p>
        <p className="mt-3">
          <strong>Live Chess.com / Lichess ratings</strong> on the community leaderboard are fetched
          from those sites for display and ranking there — they are separate from in-app Elo and are
          not written back into the Elo field.
        </p>
        <p className="mt-3">
          Registration can enforce a tournament’s <strong>min / max Elo</strong> band (defaults often
          800–3000) using the player’s in-app Elo.
        </p>
      </>
    ),
  },
  {
    id: 'leaderboard',
    title: 'Community leaderboard',
    icon: Crown,
    body: (
      <>
        <p>
          The admin/player community leaderboard ranks people across{' '}
          <strong>active and completed</strong> tournaments by:
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Number of 1st-place finishes</li>
          <li>Then 2nds</li>
          <li>Then 3rds</li>
          <li>Then total match wins</li>
          <li>Then live Chess.com rating (rapid → blitz → bullet)</li>
          <li>Then live Lichess rating</li>
          <li>Then name</li>
        </ol>
        <p className="mt-3 text-muted-foreground">
          Draft, open-registration, or cancelled events do not feed this board.
        </p>
      </>
    ),
  },
  {
    id: 'deadlines',
    title: 'Round time limits (same-day events)',
    icon: Timer,
    body: (
      <>
        <p>
          Each competition has a <strong>Round time limit</strong> (hours). Default is 24. For a
          same-day Swiss, set <strong>1–2 hours</strong> when creating or editing the event.
        </p>
        <p className="mt-3">
          When a round opens, that clock starts. In round robin, later rounds stay closed until you
          advance — then their deadline is set.
        </p>
        <p className="mt-3">
          Admins can still extend a match deadline from the match tools if someone needs more time.
        </p>
      </>
    ),
  },
  {
    id: 'compute',
    title: 'Chess.com auto-compute',
    icon: RefreshCw,
    body: (
      <>
        <p>For Chess.com tournaments with auto-compute on:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            <strong>Compute Chess.com</strong> looks up finished games between each pending pair in
            the current round (right time-control class, within the search window).
          </li>
          <li>
            <strong>One clear game</strong> (or several that agree) → match is scored automatically.
            If several agree, the <em>latest</em> game is used.
          </li>
          <li>
            <strong>Conflicting games</strong> → marked “needs review” for you to pick.
          </li>
          <li>
            <strong>No game yet</strong> → skipped (safe to click Compute again later). The admin
            button does <em>not</em> mass-mark absences unless you explicitly ask for that.
          </li>
          <li>
            When every pairing in the round is complete, compute can{' '}
            <strong>open the next round</strong> for you.
          </li>
        </ul>
        <p className="mt-3">
          Both players need a Chess.com username on their profile. Use{' '}
          <strong>Compute logs</strong> on the matches page to see exactly what the server tried,
          found, skipped, or scored.
        </p>
        <p className="mt-3 text-muted-foreground">
          A nightly job can also run if the backend stays online with the daily cron enabled — but
          for same-day events, rely on the Compute button between rounds.
        </p>
      </>
    ),
  },
  {
    id: 'odds',
    title: 'Win odds & match banter',
    icon: Swords,
    body: (
      <>
        <p>
          Pending matchups can show who is favoured using <strong>in-app Elo</strong> plus any{' '}
          <strong>head-to-head</strong> results already played in that tournament.
        </p>
        <p className="mt-3">
          Standings <strong>Win%</strong> estimates each player’s chance to win the whole event
          (simulated remaining results). Numbers update as games finish — treat them as guidance for
          banter, not official seeding.
        </p>
      </>
    ),
  },
  {
    id: 'players',
    title: 'Players, disputes & admin scoring',
    icon: Users,
    body: (
      <>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Players can submit a Chess.com game link; admins can confirm, override, or score.</li>
          <li>Disputes appear under Disputes for review and resolution.</li>
          <li>
            Force / change result is an admin tool — use a clear reason so the audit trail stays
            understandable.
          </li>
          <li>
            Advancing with unscored matches (when allowed) may mark remaining games absent — confirm
            carefully.
          </li>
        </ul>
      </>
    ),
  },
] as const

export function AppRulesGuide({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [activeId, setActiveId] = useState<(typeof SECTIONS)[number]['id']>('scoring')
  const active = SECTIONS.find((s) => s.id === activeId) ?? SECTIONS[0]

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            <BookOpen className="size-5 text-foreground" />
            <DialogTitle>App rules & how things work</DialogTitle>
          </div>
          <DialogDescription>
            Plain-language guide to scoring, tournaments, Elo, leaderboards, and Chess.com compute —
            so you can run events without reading the code.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav className="flex shrink-0 gap-1 overflow-x-auto border-b p-2 md:w-52 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
            {SECTIONS.map((section) => {
              const Icon = section.icon
              const isActive = section.id === active.id
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveId(section.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  )}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="whitespace-nowrap md:whitespace-normal">{section.title}</span>
                </button>
              )
            })}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <h3 className="text-base font-semibold text-foreground">{active.title}</h3>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-foreground/90">
              {active.body}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Icon button used in admin chrome to open the guide. */
export function AppRulesTrigger({
  onClick,
  className,
  variant = 'rail',
}: {
  onClick: () => void
  className?: string
  variant?: 'rail' | 'mobile'
}) {
  if (variant === 'mobile') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="App rules"
        className={cn(
          'fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-3 z-40 flex size-11 items-center justify-center rounded-full border border-border-subtle bg-bg-panel-dark text-accent-lime shadow-lg md:hidden',
          className
        )}
      >
        <BookOpen className="size-5" strokeWidth={1.75} />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="App rules"
      title="App rules"
      className={cn(
        'flex size-10 items-center justify-center rounded-xl text-white/45 transition-all duration-150 ease-out hover:text-white/80',
        className
      )}
    >
      <BookOpen className="size-5" strokeWidth={1.75} />
    </button>
  )
}
