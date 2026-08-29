import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock canvas and window methods for tests
if (typeof window !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    drawImage: vi.fn(),
  }) as any;

  HTMLCanvasElement.prototype.toBlob = vi.fn((callback: (blob: Blob | null) => void) => {
    callback(new Blob(['mock-data'], { type: 'image/webp' }));
  }) as any;
}
