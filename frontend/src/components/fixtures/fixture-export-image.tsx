'use client';
import type { Match } from '@/src/types/match';

export interface FixtureExportSection {
  label: string;
  matches: Match[];
}

interface FixtureExportImageProps {
  competitionName: string;
  sections: FixtureExportSection[];
  dateRange: { start: string; end: string };
}

const GOLD = '#D36802';
const GOLD_LIGHT = '#F4A93D';
const GOLD_DARK = '#B4550A';
const BLACK = '#0B0B0C';
const MUTED = '#9CA3AF';

type MatchOutcome = 'a_win' | 'b_win' | 'draw' | null;

/** Only a fully 'completed' match shows a result — pending/ongoing/disputed
 * matches render with neutral styling, same as before. */
function resolveOutcome(match: Match): MatchOutcome {
  if (match.match_status !== 'completed') return null;
  if (match.result_winner === 'a') return 'a_win';
  if (match.result_winner === 'b') return 'b_win';
  if (match.result_winner === 'draw') return 'draw';
  return null;
}

/** Small arrow flourish flanking "FIXTURES". flip=true mirrors it for the right side. */
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
  );
}

/** Gold check badge shown next to the winner's name. */
function WinnerMark() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" style={{ flexShrink: 0 }} aria-label="Winner">
      <circle cx="12" cy="12" r="12" fill={GOLD} />
      <path
        d="M7 12.5l3 3 7-7"
        stroke="#fff"
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Row(props: {
  index: number;
  left: string;
  right?: string | null;
  isBye?: boolean;
  outcome: MatchOutcome;
}) {
  const { index, left, right, isBye, outcome } = props;
  const leftWon = outcome === 'a_win';
  const rightWon = outcome === 'b_win';
  const isDraw = outcome === 'draw';

  const leftNameStyle = {
    fontSize: '20px',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: rightWon ? MUTED : BLACK,
    fontWeight: leftWon ? (800 as const) : rightWon ? (500 as const) : (600 as const),
  };
  const rightNameStyle = {
    fontSize: '20px',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: leftWon ? MUTED : BLACK,
    fontWeight: rightWon ? (800 as const) : leftWon ? (500 as const) : (600 as const),
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        padding: '16px 36px',
        background: index % 2 === 0 ? '#f5f5f5' : '#ffffff',
        borderBottom: '1px solid #ececec',
      }}
    >
      {/* number badge: rounded square, gold->bronze gradient, black number, embossed look */}
      <div
        style={{
          flex: '0 0 auto',
          width: 52,
          height: 52,
          borderRadius: 14,
          background: `linear-gradient(150deg, ${GOLD_LIGHT} 0%, ${GOLD} 55%, ${GOLD_DARK} 100%)`,
          boxShadow:
            'inset 0 2px 3px rgba(255,255,255,0.45), inset 0 -3px 5px rgba(0,0,0,0.28), 0 2px 4px rgba(0,0,0,0.18)',
          color: BLACK,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '22px',
        }}
      >
        {index + 1}
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
        <span style={leftNameStyle}>{left}</span>
        {leftWon && <WinnerMark />}
      </div>

      {/* VS hexagon: white fill, gold outline, black text — shows ½ for a confirmed draw */}
      <div style={{ flex: '0 0 auto' }}>
        <svg viewBox="0 0 100 100" style={{ width: 52, height: 52 }} aria-hidden="true">
          <polygon
            points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
            fill="#ffffff"
            stroke={GOLD}
            strokeWidth={6}
          />
          <text
            x="50"
            y="62"
            textAnchor="middle"
            fontSize={isDraw ? 22 : 26}
            fontWeight="800"
            fill={BLACK}
            fontFamily="Poppins, sans-serif"
          >
            {isDraw ? '½–½' : 'VS'}
          </text>
        </svg>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
        {rightWon && <WinnerMark />}
        <span style={rightNameStyle}>{isBye ? 'BYE' : right || 'TBD'}</span>
      </div>
    </div>
  );
}

export function FixtureExportImage(props: FixtureExportImageProps) {
  const { sections, dateRange } = props;
  const hasRange = dateRange.start && dateRange.end;
  const rangeText = hasRange ? `${dateRange.start} & ${dateRange.end}` : 'TO BE ANNOUNCED';

  return (
    <div
      style={{
        position: 'relative',
        width: 1080,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 1536, // keeps the portrait proportions of the reference (~2:3) even with few rows
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

      {/* Chess pieces — plain <img>, deliberately (see note on the trophy icons below for why). */}
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
            style={{ width: 200, height: 200, objectFit: 'contain', margin: '0 auto' }}
          />
        </div>

        {sections.length === 1 && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 24,
              }}
            >
              {/*
                Plain <img>, not next/image: this component is only ever
                mounted into a detached, off-screen host node for
                dom-to-image-more to snapshot. next/image's SVG-optimizer
                block and lazy-loading behavior don't work in that context —
                see the earlier fix where swapping this back to next/image
                broke the download button entirely.
              */}
              <img
                src="/trophy-gold.svg"
                alt="Trophy"
                style={{ width: 60, height: 60, objectFit: 'contain' }}
              />

              <div style={{ fontSize: 56, fontWeight: 800, color: BLACK }}>
                {sections[0].label}
              </div>

              <img
                src="/trophy-gold.svg"
                alt="Trophy"
                style={{ width: 60, height: 60, objectFit: 'contain' }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
                marginTop: 4,
              }}
            >
              <ArrowFlourish />
              <div style={{ fontSize: 40, fontWeight: 800, color: GOLD, letterSpacing: '10px' }}>
                FIXTURES
              </div>
              <ArrowFlourish flip />
            </div>
          </div>
        )}

        {/* single-line black date banner */}
        <div
          style={{
            background: '#000',
            textAlign: 'center',
            padding: '20px 24px',
            marginTop: 34,
            borderRadius: 12,
          }}
        >
          <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '0.5px', color: '#fff' }}>
            ALL MATCHES MUST BE PLAYED BETWEEN{' '}
          </span>
          <span style={{ fontSize: 19, fontWeight: 800, color: GOLD }}>{rangeText}</span>
        </div>

        <div
          style={{
            marginTop: 30,
            borderRadius: 14,
            overflow: 'hidden',
            border: '1px solid #ececec',
            position: 'relative',
            zIndex: 3,
          }}
        >
          {sections.map((section, idx) => (
            <div key={idx}>
              {sections.length > 1 && (
                <div
                  style={{
                    background: '#000',
                    color: '#fff',
                    textAlign: 'center',
                    padding: 12,
                    fontSize: 20,
                    fontWeight: 700,
                    letterSpacing: '4px',
                  }}
                >
                  {section.label}
                </div>
              )}
              {section.matches.map((match, j) => (
                <Row
                  key={match.id || j}
                  index={j}
                  left={match.player_a?.display_name || match.player_a_id}
                  right={match.is_bye ? 'BYE' : match.player_b?.display_name || match.player_b_id}
                  isBye={!!match.is_bye}
                  outcome={match.is_bye ? null : resolveOutcome(match)}
                />
              ))}
            </div>
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
              fontSize: 26,
              fontWeight: 700,
              color: GOLD,
            }}
          >
            <span>★</span>
            <span>SCORING SYSTEM</span>
            <span>★</span>
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, color: '#111', marginTop: 10 }}>
            WIN = 2 POINTS &nbsp;|&nbsp; DRAW = 1 POINT &nbsp;|&nbsp; LOSS = 0 POINTS
          </div>
          <div style={{ fontSize: 26, marginTop: 16, color: GOLD }}>♛</div>
        </div>
      </div>
    </div>
  );
}