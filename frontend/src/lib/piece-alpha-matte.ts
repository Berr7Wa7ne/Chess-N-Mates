/**
 * Replaces `keyWhiteToDataUrl`.
 *
 * Why the old one looked bad: it thresholded EVERY pixel in the image by
 * brightness, so any bright/white highlight *inside* the chess piece
 * (glass pieces are covered in these) also got faded — that's the patchy
 * look you saw.
 *
 * This version only clears background: it flood-fills from the four edges
 * of the image, and only marks a pixel transparent if it is (a) near-white/
 * near-gray AND (b) reachable from the edge through other background-ish
 * pixels. A bright highlight in the middle of the piece is never touched
 * because it isn't connected to the edge.
 *
 * Best fix long-term: ask whoever built the original flyer (Canva/Figma/etc.)
 * for the actual transparent PNG cutout of the piece — that will always beat
 * an algorithmic matte. Use this as the fallback if that's not available.
 */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('failed to load ' + src));
    img.src = src;
  });
}

export async function edgeFloodTransparency(
  src: string,
  opts?: { threshold?: number; saturationTolerance?: number }
): Promise<string> {
  // how bright a pixel must be to even be considered "background-ish"
  const threshold = opts?.threshold ?? 235;
  // max(r,g,b) - min(r,g,b) — keeps it from eating gold/tinted highlights,
  // only true near-white/near-gray background gets cleared
  const saturationTolerance = opts?.saturationTolerance ?? 18;

  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('no canvas ctx');
  }
  ctx.drawImage(img, 0, 0);

  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const isBgish = (pixelIndex: number): boolean => {
    const di = pixelIndex * 4;
    const r = data[di];
    const g = data[di + 1];
    const b = data[di + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return max >= threshold && max - min <= saturationTolerance;
  };

  const visited = new Uint8Array(width * height);
  const stack: number[] = [];

  const pushIfBg = (idx: number) => {
    if (!visited[idx] && isBgish(idx)) stack.push(idx);
  };

  // seed from every pixel on the four edges
  for (let x = 0; x < width; x++) {
    pushIfBg(x); // top row
    pushIfBg((height - 1) * width + x); // bottom row
  }
  for (let y = 0; y < height; y++) {
    pushIfBg(y * width); // left column
    pushIfBg(y * width + (width - 1)); // right column
  }

  while (stack.length) {
    const idx = stack.pop() as number;
    if (visited[idx]) continue;
    visited[idx] = 1;
    data[idx * 4 + 3] = 0; // fully transparent

    const px = idx % width;
    const py = (idx - px) / width;
    if (px > 0) pushIfBg(idx - 1);
    if (px < width - 1) pushIfBg(idx + 1);
    if (py > 0) pushIfBg(idx - width);
    if (py < height - 1) pushIfBg(idx + width);
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}