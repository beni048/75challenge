/**
 * Client-side image compressor using the HTML5 Canvas API.
 *
 * Every image is downscaled and re-encoded as WebP *before* it is uploaded,
 * because Supabase Storage on the free tier is capped at 1 GB and that ceiling
 * is shared by every participant (start.md §17). The numbers below are the
 * single source of truth for that budget — never write a KB or px figure into
 * a comment, a doc, or a UI string; import the constant.
 */

/** Proof photos are shown at ~780px wide at most (see FeedCard), so 800 is ample. */
export const PROOF_PHOTO_MAX_DIMENSION_PX = 800;
export const PROOF_PHOTO_QUALITY = 0.6;
export const PROOF_PHOTO_TARGET_KB = 100;

/** Avatars render at 56px at the largest; 400 covers retina comfortably. */
export const AVATAR_MAX_DIMENSION_PX = 400;
export const AVATAR_QUALITY = 0.6;
export const AVATAR_TARGET_KB = 40;

/** How far each retry drops the quality, and where it stops trying. */
export const COMPRESSION_QUALITY_STEP = 0.1;
export const COMPRESSION_QUALITY_FLOOR = 0.35;

/**
 * A hard ceiling, as a multiple of the target. Reaching the quality floor and
 * still being this far over means the encode is not working as expected — the
 * usual cause being a browser that silently produced a PNG instead of WebP
 * (see `encodeCanvas`). Rejecting is deliberate: uploading a "compressed" file
 * many times the target is exactly how the storage budget gets blown, and a
 * per-user bound you cannot enforce is not a bound.
 */
export const COMPRESSION_HARD_CEILING_MULTIPLIER = 2;

export interface CompressionResult {
  file: File;
  blob: Blob;
  previewUrl: string;
  originalSizeKB: number;
  compressedSizeKB: number;
  /** The MIME type actually produced. Not always WebP — see `encodeCanvas`. */
  outputType: string;
}

/**
 * Scales `width`×`height` down to fit inside `maxWidth`×`maxHeight`, preserving
 * the aspect ratio. An image already inside the box is returned untouched —
 * upscaling would add bytes without adding detail.
 *
 * Pure, so it carries the unit tests for the sizing rule (testing.md).
 */
export function scaleToFit(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };

  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * The next quality to try, clamped to the floor.
 *
 * Returns `null` once the floor has been reached, so the caller stops rather
 * than recursing below it. The previous implementation stepped by 0.15 from
 * 0.82 and landed on 0.37 — under its own 0.4 floor — because it compared
 * before subtracting instead of after.
 */
export function nextQuality(quality: number): number | null {
  if (quality <= COMPRESSION_QUALITY_FLOOR) return null;
  return Math.max(quality - COMPRESSION_QUALITY_STEP, COMPRESSION_QUALITY_FLOOR);
}

/**
 * `canvas.toBlob(cb, 'image/webp', q)` is specified to fall back to PNG when
 * the requested type is unsupported — silently, and ignoring `quality`
 * entirely, since PNG is lossless. The result is a file many times larger than
 * asked for, carrying a `.webp` name and a WebP content type. A 1.26 MB
 * `image/png` sitting in the proof-photos bucket under a `.webp` filename is
 * how this was found.
 *
 * So: ask for WebP, then check what actually came back, and fall back to JPEG
 * — which is universally supported and *does* honour `quality` — rather than
 * shipping an unbounded PNG.
 */
function encodeCanvas(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob && blob.type === 'image/webp') {
          resolve(blob);
          return;
        }

        canvas.toBlob(
          (jpeg) => {
            if (jpeg) resolve(jpeg);
            else reject(new Error('Canvas to Blob conversion failed'));
          },
          'image/jpeg',
          quality
        );
      },
      'image/webp',
      quality
    );
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image failed to load'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}

/**
 * Downscales and re-encodes an image, retrying at progressively lower quality
 * until it fits `targetKB` or hits the quality floor.
 *
 * Throws if the result is still over the hard ceiling at the floor — see
 * `COMPRESSION_HARD_CEILING_MULTIPLIER`. Callers surface that as a translated
 * toast rather than uploading.
 */
export async function compressImageToWebP(
  file: File,
  maxWidth = PROOF_PHOTO_MAX_DIMENSION_PX,
  maxHeight = PROOF_PHOTO_MAX_DIMENSION_PX,
  initialQuality = PROOF_PHOTO_QUALITY,
  targetKB = PROOF_PHOTO_TARGET_KB
): Promise<CompressionResult> {
  const originalSizeKB = Math.round(file.size / 1024);
  const img = await loadImage(file);

  const { width, height } = scaleToFit(img.width, img.height, maxWidth, maxHeight);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not obtain canvas 2D rendering context');
  ctx.drawImage(img, 0, 0, width, height);

  let quality = initialQuality;
  let blob = await encodeCanvas(canvas, quality);

  while (blob.size / 1024 > targetKB) {
    const next = nextQuality(quality);
    if (next === null) break;
    quality = next;
    blob = await encodeCanvas(canvas, quality);
  }

  const compressedSizeKB = Math.round(blob.size / 1024);

  if (compressedSizeKB > targetKB * COMPRESSION_HARD_CEILING_MULTIPLIER) {
    throw new Error(
      `Compressed image is ${compressedSizeKB} KB, over the ${targetKB} KB budget`
    );
  }

  const extension = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const compressedFile = new File(
    [blob],
    `${file.name.replace(/\.[^/.]+$/, '')}.${extension}`,
    { type: blob.type }
  );

  return {
    file: compressedFile,
    blob,
    previewUrl: URL.createObjectURL(blob),
    originalSizeKB,
    compressedSizeKB,
    outputType: blob.type,
  };
}
