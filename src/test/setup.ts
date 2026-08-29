import '@testing-library/jest-dom';
import { vi } from 'vitest';

// JSDOM implements neither canvas rendering nor WebP encoding, so the image
// compression path needs both stubbed before any component renders.
if (typeof window !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    drawImage: vi.fn(),
  }) as unknown as HTMLCanvasElement['getContext'];

  HTMLCanvasElement.prototype.toBlob = vi.fn((callback: BlobCallback) => {
    callback(new Blob(['mock-data'], { type: 'image/webp' }));
  }) as unknown as HTMLCanvasElement['toBlob'];

  // JSDOM ships no media-query engine. Components that react to a breakpoint
  // (the nav burger panel) get a never-matching query rather than a crash.
  if (!window.matchMedia) {
    window.matchMedia = vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  }
}
