'use client'

import domtoimage from 'dom-to-image-more'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import type { CommunityLeaderboardEntry } from '@/src/lib/community-leaderboard'
import { LeaderboardExportImage } from '@/src/components/leaderboard/leaderboard-export-image'
import { fixtureDownloadSlug } from '@/src/lib/fixture-stages'

export type LeaderboardExportFormat = 'png' | 'jpeg'

export interface DownloadLeaderboardParams {
  entries: CommunityLeaderboardEntry[]
  subtitle?: string
  format?: LeaderboardExportFormat
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

export async function downloadLeaderboardImage(params: DownloadLeaderboardParams): Promise<void> {
  const { entries, subtitle, format = 'png', pixelRatio = 2 } = params
  if (!entries.length) {
    throw new Error('no-leaderboard-entries')
  }

  const host = makeOffscreenHost()
  const root = createRoot(host)
  try {
    flushSync(() => {
      root.render(
        <LeaderboardExportImage entries={entries} subtitle={subtitle} />
      )
    })
    const node = host.firstElementChild as HTMLElement
    const dataUrl =
      format === 'jpeg'
        ? await domtoimage.toJpeg(node, { bgcolor: '#ffffff', pixelRatio, quality: 0.95 })
        : await domtoimage.toPng(node, { bgcolor: '#ffffff', pixelRatio })
    const date = new Date().toISOString().slice(0, 10)
    const slug = fixtureDownloadSlug('community-leaderboard')
    const ext = format === 'jpeg' ? 'jpg' : 'png'
    triggerDownload(dataUrl, `${slug}-${date}.${ext}`)
  } finally {
    root.unmount()
    host.remove()
  }
}
