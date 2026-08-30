import { describe, it, expect } from 'vitest';
import {
  scaleToFit,
  nextQuality,
  PROOF_PHOTO_MAX_DIMENSION_PX,
  PROOF_PHOTO_TARGET_KB,
  COMPRESSION_QUALITY_FLOOR,
  COMPRESSION_QUALITY_STEP,
  PROOF_PHOTO_QUALITY,
} from '@/lib/image-compressor';

// The canvas encode path itself is not unit-tested (testing.md: anything
// needing a real browser/Storage connection is verified by hand). These cover
// the two pure decisions extracted out of it.

describe('scaleToFit', () => {
  it('shrinks a landscape image to the width bound, preserving ratio', () => {
    expect(scaleToFit(4000, 3000, 800, 800)).toEqual({ width: 800, height: 600 });
  });

  it('shrinks a portrait image to the height bound, preserving ratio', () => {
    expect(scaleToFit(3000, 4000, 800, 800)).toEqual({ width: 600, height: 800 });
  });

  it('leaves an image already inside the box untouched', () => {
    // Upscaling would add bytes without adding any detail.
    expect(scaleToFit(400, 300, 800, 800)).toEqual({ width: 400, height: 300 });
  });

  it('never returns a zero dimension for an extreme aspect ratio', () => {
    const { width, height } = scaleToFit(10000, 3, 800, 800);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  it('handles a degenerate image without producing NaN', () => {
    expect(scaleToFit(0, 0, 800, 800)).toEqual({ width: 0, height: 0 });
  });
});

describe('nextQuality', () => {
  it('steps down by the configured amount', () => {
    expect(nextQuality(PROOF_PHOTO_QUALITY)).toBeCloseTo(
      PROOF_PHOTO_QUALITY - COMPRESSION_QUALITY_STEP
    );
  });

  it('never returns a value below the floor', () => {
    // The previous implementation compared before subtracting and so settled
    // on 0.37 with a stated floor of 0.4.
    let q: number | null = PROOF_PHOTO_QUALITY;
    while (q !== null) {
      expect(q).toBeGreaterThanOrEqual(COMPRESSION_QUALITY_FLOOR);
      q = nextQuality(q);
    }
  });

  it('stops at the floor rather than looping forever', () => {
    expect(nextQuality(COMPRESSION_QUALITY_FLOOR)).toBeNull();
  });
});

describe('Storage budget constants', () => {
  it('targets a feed-sized image, not a full-resolution one', () => {
    expect(PROOF_PHOTO_MAX_DIMENSION_PX).toBe(800);
    expect(PROOF_PHOTO_TARGET_KB).toBe(100);
  });
});
