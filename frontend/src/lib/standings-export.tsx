'use client'

import domtoimage from 'dom-to-image-more'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import type { Competition, StandingEntry, TournamentType } from '@/src/types/competition'
import { StandingsExportImage } from '@/src/components/standings/standings-export-image'
import { getRoundLabel, fixtureDownloadSlug } from '@/src/lib/fixture-stages'

export type StandingsExportFormat = 'png' | 'jpeg'

export interface DownloadStandingsParams {
  /**
   * Full competition object when available (preferred) — the poster name,
   * tournament type, and round label are derived from it.
   */
  competition?: Competition
  /** Fallback poster header name when only the string is available. */
  competitionName?: string
  /** Fallback tournament type when no competition object is available. */
  tournamentType?: TournamentType
  /** Explicit round label (e.g. "ROUND 2"); overrides the derived one. */
  roundLabel?: string
  standings: StandingEntry[]
  /** png = crisp lossless text + flat colours (default); jpeg = smaller file. */
  format?: StandingsExportFormat
  pixelRatio?: number
}

function triggerDownload(dataUrl: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function makeOffscreenHost(): HTMLDivElement {
  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.left = '-100000px'
  host.style.top = '0'
  host.style.pointerEvents = 'none'
  document.body.appendChild(host)
  return host
}

/**
 * Renders the LIVE STANDINGS poster offscreen (same pipeline as
 * fixture-export) and downloads it as a standalone PNG/JPEG.
 */
export async function downloadStandingsImage(params: DownloadStandingsParams): Promise<void> {
  const { competition, standings, format = 'png', pixelRatio = 2 } = params
  if (!standings.length) {
    throw new Error('no-standings')
  }
  const competitionName = competition?.name ?? params.competitionName ?? 'Standings'
  const tournamentType = competition?.tournament_type ?? params.tournamentType
  const roundLabel =
    params.roundLabel ??
    (competition
      ? getRoundLabel(competition, Math.max(competition.current_round ?? 1, 1))
      : 'LIVE')

  const host = makeOffscreenHost()
  const root = createRoot(host)
  try {
    flushSync(() => {
      root.render(
        <StandingsExportImage
          competitionName={competitionName}
          roundLabel={roundLabel}
          tournamentType={tournamentType}
          standings={standings}
        />
      )
    })
    const node = host.firstElementChild as HTMLElement
    const dataUrl =
      format === 'jpeg'
        ? await domtoimage.toJpeg(node, { bgcolor: '#ffffff', pixelRatio, quality: 0.95 })
        : await domtoimage.toPng(node, { bgcolor: '#ffffff', pixelRatio })
    const slug = fixtureDownloadSlug(competitionName)
    const ext = format === 'jpeg' ? 'jpg' : 'png'
    triggerDownload(dataUrl, `${slug}-standings.${ext}`)
  } finally {
    root.unmount()
    host.remove()
  }
}