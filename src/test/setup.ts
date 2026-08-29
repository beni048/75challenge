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
}
