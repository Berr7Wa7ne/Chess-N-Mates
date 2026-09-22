'use client'
import type { StandingEntry, TournamentType } from '@/src/types/competition'
// ─── Palette (mirrors the fixture export image) ─────────────────────
const GOLD = '#D36802'
const GOLD_LIGHT = '#F4A93D'
const GOLD_DARK = '#B4550A'
const BLACK = '#0B0B0C'
const MUTED = '#9CA3AF'
const GREEN = '#16a34a'
const AMBER = '#d97706'
const RED = '#dc2626'
// ─── Pace — the "story" colours (above / at / below par) ─────────────
type Pace = 'above' | 'at' | 'below'
/**
 * Club scoring is WIN = 2, DRAW = 1, LOSS = 0 (backend/services/tournament/scoring.js),
 * so "par" after N completed games is exactly N points (50% of the max possible).
 *   points  > played  → ABOVE PAR (green)
 *   points === played → AT PAR    (amber)
 *   points  < played  → BELOW PAR (red)
 */
function paceOf(row: StandingEntry): Pace {
  if (row.played <= 0) return 'at'
  if (row.points > row.played) return 'above'
  if (row.points === row.played) return 'at'
  return 'below'
}
interface PaceStyle {
  color: string
  tint: string
  label: string
}
const PACE: Record<Pace, PaceStyle> = {
  above: { color: GREEN, tint: 'rgba(22, 163, 74, 0.10)', label: 'ABOVE PAR' },
  at: { color: AMBER, tint: 'rgba(217, 119, 6, 0.09)', label: 'AT PAR' },
  below: { color: RED, tint: 'rgba(220, 38, 38, 0.10)', label: 'BELOW PAR' },
}
// ─── Small ornaments (mirror the fixture export image) ───────────────
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
function LegendChip({ color, text }: { color: string; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span
        style={{
          display: 'inline-block',
          width: 15,
          height: 15,
          borderRadius: 4,
          background: color,
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>{text}</span>
    </div>
  )
}
// ─── Table cells ─────────────────────────────────────────────────────
function NumberCell({ value, color, strong }: { value: string | number; color?: string; strong?: boolean }) {
  return (
    <div
      style={{
        textAlign: 'center',
        fontSize: 20,
        fontWeight: strong ? 800 : 700,
        fontVariantNumeric: 'tabular-nums',
        color: color ?? BLACK,
      }}
    >
      {value}
    </div>
  )
}
// ─── Standings row ───────────────────────────────────────────────────
interface StandingsExportRowProps {
  row: StandingEntry
  isSwiss: boolean
  showBye: boolean
  cols: string
}

function StandingsExportRow({ row, isSwiss, showBye, cols }: StandingsExportRowProps) {
  const pace = paceOf(row)
  const style = PACE[pace]
  const subtitle = row.chess_elo != null ? `ELO ${row.chess_elo}` : row.chess_username || ''
  const absences = row.absences ?? 0
  const showRed = absences > 0
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: cols,
        alignItems: 'center',
        background: style.tint,
        borderBottom: '1px solid #ececec',
        position: 'relative',
        padding: '16px 36px 16px 30px',
      }}
    >
      {/* pace accent stripe */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          background: style.color,
        }}
      />
      {/* rank badge: gold → bronze gradient, black number (mirror fixture) */}
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 12,
          background: `linear-gradient(150deg, ${GOLD_LIGHT} 0%, ${GOLD} 55%, ${GOLD_DARK} 100%)`,
          boxShadow:
            'inset 0 2px 3px rgba(255,255,255,0.45), inset 0 -3px 5px rgba(0,0,0,0.28), 0 2px 4px rgba(0,0,0,0.18)',
          color: BLACK,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: 20,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {row.rank}
      </div>
      {/* player name + ELO */}
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
          {row.display_name}
        </div>
        {subtitle && (
          <div style={{ fontSize: 14, fontWeight: 600, color: MUTED, marginTop: 2 }}>{subtitle}</div>
        )}
      </div>
      <NumberCell value={row.played} />
      <NumberCell value={row.wins} />
      <NumberCell value={row.draws} color={AMBER} />
      <NumberCell value={row.losses} color={RED} />
      {/* Pts — coloured to mirror the row's pace story */}
      <NumberCell value={row.points} color={style.color} strong />
      {isSwiss && (
        <>
          <NumberCell value={row.buchholz ?? '—'} />
          <NumberCell value={row.buchholz_cut1 ?? '—'} />
          <NumberCell value={row.sonneborn_berger ?? '—'} />
        </>
      )}
      <NumberCell value={row.absences} />
      {showBye && <NumberCell value={row.byes ?? 0} />}
    </div>
  )
}
// ─── Export poster ───────────────────────────────────────────────────
export interface StandingsExportImageProps {
  competitionName: string
  roundLabel: string
  tournamentType?: TournamentType
  standings: StandingEntry[]
  participantCount?: number
}
export function StandingsExportImage({
  competitionName,
  roundLabel,
  tournamentType,
  standings,
  participantCount,
}: StandingsExportImageProps) {
  const isSwiss = tournamentType === 'swiss'
  const count = participantCount ?? standings.length;
  const hasByeData = standings.some((s) => (s.byes ?? 0) > 0);
  const showBye = hasByeData || (count % 2 === 1);
  const cols = [
    '60px',
    'minmax(0, 1fr)',
    '56px',
    '56px',
    '56px',
    '56px',
    '72px',
    ...(isSwiss ? ['72px', '76px', '72px'] : []),
    '56px',
    ...(showBye ? ['56px'] : []),
  ].join(' ')
  const headerCell: React.CSSProperties = {
    textAlign: 'center',
    fontSize: 17,
    fontWeight: 800,
    letterSpacing: '1.5px',
    color: '#fff',
  }
  const headerCellLeft: React.CSSProperties = { ...headerCell, textAlign: 'left' }
  return (
    <div
      style={{
        position: 'relative',
        width: 1080,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 1536,
        background: '#ffffff',
        overflow: 'hidden',
        fontFamily: '"Poppins", ui-sans-serif, system-ui, sans-serif',
      }}
    >
      {/* dotted background texture */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(#e8e4da 1.2px, transparent 1.2px)',
          backgroundSize: '16px 16px',
          opacity: 0.55,
        }}
      />
      {/* Chess pieces — plain <img> (same reason as fixture-export-image: plays well with dom-to-image) */}
      <img
        src="/chesspiece.png"
        alt=""
        style={{
          position: 'absolute',
          left: -60,
          top: 420,
          height: 1000,
          width: 'auto',
          objectFit: 'contain',
          opacity: 0.16,
          zIndex: 2,
        }}
      />
      <img
        src="/chesspiece.png"
        alt=""
        style={{
          position: 'absolute',
          right: -60,
          top: 420,
          height: 1000,
          width: 'auto',
          objectFit: 'contain',
          opacity: 0.16,
          transform: 'scaleX(-1)',
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 3,
          padding: '48px 96px 40px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        {/* header logo */}
        <div style={{ textAlign: 'center' }}>
          <img
            src="/latest-app-logo.png"
            alt="Chess N Mates"
            style={{ width: 180, height: 180, objectFit: 'contain', margin: '0 auto' }}
          />
        </div>
        {/* round label: [trophy] ROUND X [trophy]  +  ◁ STANDINGS ▷ */}
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
            <img src="/trophy-gold.svg" alt="" style={{ width: 56, height: 56, objectFit: 'contain' }} />
            <div style={{ fontSize: 52, fontWeight: 800, color: BLACK }}>{roundLabel}</div>
            <img src="/trophy-gold.svg" alt="" style={{ width: 56, height: 56, objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 2 }}>
            <ArrowFlourish />
            <div style={{ fontSize: 38, fontWeight: 800, color: GOLD, letterSpacing: '10px' }}>
              STANDINGS
            </div>
            <ArrowFlourish flip />
          </div>
        </div>
        {/* black banner: LIVE STANDINGS · <competition> */}
        <div
          style={{
            background: '#000',
            textAlign: 'center',
            padding: '18px 24px',
            marginTop: 30,
            borderRadius: 12,
          }}
        >
          <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '0.5px', color: '#fff' }}>
            LIVE STANDINGS&nbsp;·&nbsp;
          </span>
          <span style={{ fontSize: 19, fontWeight: 800, color: GOLD }}>{competitionName}</span>
        </div>
{/* standings table */}
        <div
          style={{
            marginTop: 28,
            borderRadius: 14,
            overflow: 'hidden',
            border: '1px solid #ececec',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: cols,
              alignItems: 'center',
              background: '#111',
              padding: '16px 20px',
              gap: 0,
            }}
          >
            <div style={{ ...headerCellLeft, fontSize: 0 }} />
            <div style={headerCellLeft}>PLAYER</div>
            <div style={headerCell} title="Played">P</div>
            <div style={headerCell} title="Wins">W</div>
            <div style={headerCell} title="Draws">D</div>
            <div style={headerCell} title="Losses">L</div>
            <div style={headerCell} title="Points">PTS</div>
            {isSwiss && (
              <>
                <div style={headerCell} title="Buchholz">BH</div>
                <div style={headerCell} title="Buchholz Cut-1">BH-C1</div>
                <div style={headerCell} title="Sonneborn-Berger">SB</div>
              </>
            )}
            <div style={headerCell} title="Absences">ABS</div>
            {showBye && <div style={headerCell} title="Byes">BYE</div>}
          </div>
          {standings.map((row, i) => (
            <StandingsExportRow
              key={row.user_id ?? i}
              row={row}
              isSwiss={isSwiss}
              showBye={showBye}
              cols={cols}
            />
          ))}
        </div>
        <div style={{ flex: '1 1 0px' }} />
        {/* footer: colour legend + scoring */}
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
            <span>★</span>
            <span>FORM &amp; PACE</span>
            <span>★</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 28,
              marginTop: 14,
              flexWrap: 'wrap',
            }}
          >
            <LegendChip color={GREEN} text="ABOVE PAR — OVER 50% OF MAX POINTS" />
            <LegendChip color={AMBER} text="AT PAR — EXACTLY 50%" />
            <LegendChip color={RED} text="BELOW PAR — UNDER 50%" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111', marginTop: 12 }}>
            WIN = 2 POINTS &nbsp;|&nbsp; DRAW = 1 POINT &nbsp;|&nbsp; LOSS = 0 POINTS
          </div>
          <div style={{ fontSize: 24, marginTop: 12, color: GOLD }}>♛</div>
        </div>
      </div>
    </div>
  )
}
