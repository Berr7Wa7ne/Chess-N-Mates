'use client';
import domtoimage from 'dom-to-image-more';
import jsPDF from 'jspdf';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { Competition } from '@/src/types/competition';
import type { Match } from '@/src/types/match';
import { FixtureExportImage, type FixtureExportSection } from '@/src/components/fixtures/fixture-export-image';
import { getRoundLabel, getFixtureDateRange, fixtureDownloadSlug } from '@/src/lib/fixture-stages';

interface DownloadFixturesParams {
  competition: Competition;
  matches: Match[];
  round?: number;
  allRounds?: boolean;
}

function buildSections(
  competition: Competition,
  matches: Match[],
  round?: number,
  allRounds?: boolean
): FixtureExportSection[] {
  if (allRounds) {
    const roundNos = [...new Set(matches.map((m) => m.round_number))].sort((a, b) => a - b);
    return roundNos.map((r) => ({
      label: getRoundLabel(competition, r),
      matches: matches.filter((m) => m.round_number === r),
    }));
  }
  const r = round ?? competition.current_round ?? 1;
  const roundMatches = matches.filter((m) => m.round_number === r).sort((a, b) => a.leg - b.leg);
  return [{ label: getRoundLabel(competition, r), matches: roundMatches }];
}

function triggerDownload(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function loadImageDims(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('failed to measure rendered fixture image'));
    img.src = src;
  });
}

function makeOffscreenHost(): HTMLDivElement {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-100000px';
  host.style.top = '0';
  host.style.pointerEvents = 'none';
  document.body.appendChild(host);
  return host;
}

/**
 * Single-round download — unchanged behavior, still a PNG.
 * Used for the per-round download button (admin single round, player side).
 */
export async function downloadFixturesImage(params: DownloadFixturesParams): Promise<void> {
  const { competition, matches, round, allRounds } = params;
  if (!matches.length) {
    throw new Error('no-fixtures');
  }
  const sections = buildSections(competition, matches, round, allRounds);
  const dateRange = getFixtureDateRange(competition);

  const host = makeOffscreenHost();
  const root = createRoot(host);
  try {
    flushSync(() => {
      root.render(
        <FixtureExportImage
          competitionName={competition.name}
          sections={sections}
          dateRange={dateRange}
        />
      );
    });
    const node = host.firstElementChild as HTMLElement;
    const dataUrl = await domtoimage.toPng(node, { bgcolor: '#ffffff', pixelRatio: 2 });
    const slug = fixtureDownloadSlug(competition.name);
    const label = allRounds ? 'all-rounds' : `round-${round ?? competition.current_round ?? 1}`;
    triggerDownload(dataUrl, `${slug}-${label}-fixtures.png`);
  } finally {
    root.unmount();
    host.remove();
  }
}

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const PAGE_MARGIN_PT = 24;

/**
 * "Download all fixtures" — now a PDF with one round per page, instead of
 * one giant stacked PNG. Renders each round through the same
 * FixtureExportImage component used for single-round downloads (so it gets
 * the full trophy/FIXTURES header per page, not just a plain list), captures
 * it as a PNG the same way, then drops each capture onto its own A4 page,
 * scaled to fit and centered.
 */
export async function downloadFixturesPdf(params: Omit<DownloadFixturesParams, 'round' | 'allRounds'>): Promise<void> {
  const { competition, matches } = params;
  if (!matches.length) {
    throw new Error('no-fixtures');
  }

  const roundNos = [...new Set(matches.map((m) => m.round_number))].sort((a, b) => a - b);
  const dateRange = getFixtureDateRange(competition);

  const host = makeOffscreenHost();
  const root = createRoot(host);

  let pdf: jsPDF | null = null;

  try {
    for (const roundNo of roundNos) {
      const roundMatches = matches
        .filter((m) => m.round_number === roundNo)
        .sort((a, b) => a.leg - b.leg);
      const section: FixtureExportSection = {
        label: getRoundLabel(competition, roundNo),
        matches: roundMatches,
      };

      flushSync(() => {
        root.render(
          <FixtureExportImage
            competitionName={competition.name}
            sections={[section]}
            dateRange={dateRange}
          />
        );
      });

      const node = host.firstElementChild as HTMLElement;
      // JPEG instead of PNG: this content (dotted background texture +
      // photographic chess-piece watermark) compresses far better lossy than
      // lossless, and since the page background is already opaque white
      // there's no transparency being lost. pixelRatio dropped from 2 to
      // 1.5 too — the image gets scaled down to fit the A4 page regardless,
      // so full 2x resolution was wasted data for a PDF.
      const dataUrl = await domtoimage.toJpeg(node, {
        bgcolor: '#ffffff',
        pixelRatio: 1.5,
        quality: 0.92,
      });
      const { width: pxWidth, height: pxHeight } = await loadImageDims(dataUrl);

      // pixelRatio:1.5 scaled the raster; back that out to get CSS px, then
      // to points (1 CSS px = 0.75pt at 96dpi).
      const imgWidthPt = (pxWidth / 1.5) * 0.75;
      const imgHeightPt = (pxHeight / 1.5) * 0.75;

      const availableW = A4_WIDTH_PT - PAGE_MARGIN_PT * 2;
      const availableH = A4_HEIGHT_PT - PAGE_MARGIN_PT * 2;
      const scale = Math.min(availableW / imgWidthPt, availableH / imgHeightPt, 1);
      const drawW = imgWidthPt * scale;
      const drawH = imgHeightPt * scale;
      const x = (A4_WIDTH_PT - drawW) / 2;
      const y = PAGE_MARGIN_PT;

      if (!pdf) {
        pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      } else {
        pdf.addPage('a4', 'portrait');
      }
      pdf.addImage(dataUrl, 'JPEG', x, y, drawW, drawH, undefined, 'MEDIUM');
    }

    if (pdf) {
      const slug = fixtureDownloadSlug(competition.name);
      pdf.save(`${slug}-all-rounds-fixtures.pdf`);
    }
  } finally {
    root.unmount();
    host.remove();
  }
}