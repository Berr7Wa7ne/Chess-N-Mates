'use client'

import type { CommunityLeaderboardEntry } from '@/src/lib/community-leaderboard'

const GOLD = '#D36802'
const GOLD_LIGHT = '#F4A93D'
const GOLD_DARK = '#B4550A'
const BLACK = '#0B0B0C'

const PODIUM = {
  gold: '#D4A017',
  silver: '#6B7280',
  bronze: '#B45309',
} as const

type PodiumTone = 'gold' | 'silver' | 'bronze' | 'standard'

function toneOf(rank: number): PodiumTone {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  return 'standard'
}

const TONE_BG: Record<PodiumTone, string> = {
  gold: 'rgba(212, 160, 23, 0.13)',
  silver: 'rgba(107, 114, 128, 0.12)',
  bronze: 'rgba(180, 83, 9, 0.12)',
  standard: '#fff',
}

const TONE_ACCENT: Record<PodiumTone, string> = {
  gold: PODIUM.gold,
  silver: PODIUM.silver,
  bronze: PODIUM.bronze,
  standard: GOLD,
}


function ArrowFlourish({ flip }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 70 16"
      width={70}
      height={16}
      style={{ transform: flip ? 'scaleX(-1)' : undefined }}
    >
      <polygon points="0,8 70,8 70,4 22,4 30,0 30,4 0,4" fill={GOLD} />
      <polygon points="0,8 70,8 70,12 22,12 30,16 30,12 0,12" fill={GOLD} />
    </svg>
  )
}

function TrophyMark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/trophy-gold.svg" alt="Trophy" style={{ width: 60, height: 60, objectFit: 'contain' }} />
  )
}

const rankBadge: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 14,
  background: `linear-gradient(150deg, ${GOLD_LIGHT} 0%, ${GOLD} 55%, ${GOLD_DARK} 100%)`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 20,
  fontWeight: 800,
  color: BLACK,
  flexShrink: 0,
}

const headerCell: React.CSSProperties = {
  textAlign: 'center',
  fontSize: 17,
  fontWeight: 800,
  letterSpacing: '1.5px',
  color: BLACK,
}

const headerCellLeft: React.CSSProperties = {
  ...headerCell,
  textAlign: 'left',
}

function NumberCell({ value, strong }: { value: string | number; strong?: boolean }) {
  return (
    <div
      style={{
        textAlign: 'center',
        fontSize: 20,
        fontWeight: strong ? 800 : 700,
        fontVariantNumeric: 'tabular-nums',
        color: BLACK,
      }}
    >
      {value}
    </div>
  )
}

export const LEADERBOARD_COLS =
  '60px minmax(0, 1.7fr) 80px 58px 58px 58px 70px 92px 82px'

export function LeaderboardExportRow({ entry }: { entry: CommunityLeaderboardEntry }) {
  const tone = toneOf(entry.rank)
  const subtitle = entry.chessUsername
    ? `@${entry.chessUsername}`
    : `${entry.tournamentsPlayed} tournament${entry.tournamentsPlayed === 1 ? '' : 's'}`
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: LEADERBOARD_COLS,
        alignItems: 'center',
        columnGap: 8,
        padding: '16px 36px 16px 30px',
        background: TONE_BG[tone],
        borderBottom: '1px solid #ececec',
        borderLeft: `6px solid ${TONE_ACCENT[tone]}`,
      }}
    >
      <div style={rankBadge}>{entry.rank}</div>
      <div style={{ minWidth: 0, padding: '0 16px 0 14px' }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: BLACK,
            lineHeight: 1.25,
            overflowWrap: 'break-word',
          }}
        >
          {entry.displayName}
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: '#6B7280',
            marginTop: 3,
            overflowWrap: 'break-word',
          }}
        >
          {subtitle}
        </div>
      </div>
      <NumberCell value={entry.communityElo} strong />
      <NumberCell value={entry.tournamentsPlayed} />
      <NumberCell value={entry.matchWins} />
      <NumberCell value={entry.matchDraws} />
      <NumberCell value={entry.matchLosses} />
      <NumberCell value={entry.firstPlaces} />
      <NumberCell value={`${entry.matchWins}W-${entry.matchDraws}D`} />
    </div>
  )
}


export interface LeaderboardExportImageProps {
  entries: CommunityLeaderboardEntry[]
  subtitle?: string
}

export function LeaderboardExportImage({ entries, subtitle }: LeaderboardExportImageProps) {
  return (
    <div
      style={{
        width: 1080,
        minHeight: 1536,
        background: '#ffffff',
        color: BLACK,
        fontFamily: 'Poppins, Arial, sans-serif',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(#e5e5e5 1.1px, transparent 1.1px)',
          backgroundSize: '22px 22px',
          opacity: 0.55,
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 240,
          left: -70,
          fontSize: 340,
          opacity: 0.05,
          transform: 'rotate(-12deg)',
          zIndex: 0,
          lineHeight: 1,
        }}
      >
        {'\u265E'}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 170,
          right: -60,
          fontSize: 320,
          opacity: 0.05,
          transform: 'rotate(10deg)',
          zIndex: 0,
          lineHeight: 1,
        }}
      >
        {'\u265C'}
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          padding: '64px 56px 56px',
          minHeight: 1536,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/latest-app-logo.png" alt="Chess N Mates" width={150} height={150} style={{ objectFit: 'contain' }} />
        </div>

        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26, marginTop: 30 }}
        >
          <TrophyMark />
          <span style={{ fontSize: 52, fontWeight: 800, letterSpacing: '3px', color: BLACK }}>
            COMMUNITY
          </span>
          <TrophyMark />
        </div>
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 18 }}
        >
          <ArrowFlourish />
          <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: '10px', color: GOLD }}>
            LEADERBOARD
          </span>
          <ArrowFlourish flip />
        </div>

        <div
          style={{ marginTop: 26, background: '#111', borderRadius: 12, padding: '20px 24px', textAlign: 'center' }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.5px', color: '#fff' }}>
            COMMUNITY LEADERBOARD&nbsp;&middot;&nbsp;
          </span>
          <span style={{ fontSize: 18, fontWeight: 800, color: GOLD }}>
            {subtitle ?? `AS OF ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}`}
          </span>
        </div>

        <div style={{ marginTop: 28, borderRadius: 14, overflow: 'hidden', border: '1px solid #ececec' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: LEADERBOARD_COLS,
              alignItems: 'center',
              columnGap: 8,
              background: '#111',
              padding: '16px 36px 16px 30px',
            }}
          >
            <div style={{ ...headerCellLeft, fontSize: 0 }} />
            <div style={headerCellLeft}>PLAYER</div>
            <div style={headerCell} title="Community ELO">ELO</div>
            <div style={headerCell} title="Tournaments played">TOURS</div>
            <div style={headerCell} title="Match wins">W</div>
            <div style={headerCell} title="Match draws">D</div>
            <div style={headerCell} title="Match losses">L</div>
            <div style={headerCell} title="Tournament 1st-place finishes">1ST</div>
            <div style={headerCell} title="Win-draw record">RECORD</div>
          </div>
          {entries.map((entry) => (
            <LeaderboardExportRow key={entry.userId} entry={entry} />
          ))}
        </div>

        <div style={{ flex: '1 1 0px' }} />

        <div style={{ textAlign: 'center', marginTop: 36, position: 'relative', zIndex: 3 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              fontSize: 24,
              fontWeight: 700,
              color: GOLD,
            }}
          >
            <span>{'\u2605'}</span>
            <span>COMMUNITY ELO</span>
            <span>{'\u2605'}</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111', marginTop: 12 }}>
            SEED = 1000 + CHESS.COM RAPID &divide; 2 &nbsp;&middot;&nbsp; ONLY TOURNAMENT RESULTS MOVE IT
          </div>
          <div style={{ fontSize: 24, marginTop: 12, color: GOLD }}>{'\u265B'}</div>
        </div>
      </div>
    </div>
  )
}
