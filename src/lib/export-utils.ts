/**
 * DOM to Image social story exporter using html-to-image.
 * Used for exporting 9:16 Milestone Cards for Instagram/TikTok stories.
 */
import { toPng, toJpeg } from 'html-to-image';

export interface ExportOptions {
  fileName?: string;
  format?: 'png' | 'jpeg';
  quality?: number;
}

export async function exportElementAsImage(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<string> {
  const {
    fileName = `75challenge-milestone-${Date.now()}`,
    format = 'png',
    quality = 0.95,
  } = options;

  try {
    let dataUrl: string;

    if (format === 'jpeg') {
      dataUrl = await toJpeg(element, { quality, pixelRatio: 2 });
    } else {
      dataUrl = await toPng(element, { pixelRatio: 2 });
    }

    // Trigger download
    const link = document.createElement('a');
    link.download = `${fileName}.${format}`;
    link.href = dataUrl;
    link.click();

    return dataUrl;
  } catch (error) {
    console.error('Failed to export element as image:', error);
    throw error;
  }
}
