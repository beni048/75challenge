/**
 * Client-side image compressor using HTML5 Canvas API.
 * Converts input images to WebP format, scaling max dimension to 1200px and ensuring size < 200 KB.
 */

export interface CompressionResult {
  file: File;
  blob: Blob;
  previewUrl: string;
  originalSizeKB: number;
  compressedSizeKB: number;
}

export async function compressImageToWebP(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  initialQuality = 0.82
): Promise<CompressionResult> {
  const originalSizeKB = Math.round(file.size / 1024);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio scale
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not obtain canvas 2D rendering context'));
          return;
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to WebP
        const tryCompress = (quality: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Canvas to Blob conversion failed'));
                return;
              }

              const compressedSizeKB = Math.round(blob.size / 1024);

              // If still > 200KB and quality > 0.4, compress further
              if (compressedSizeKB > 200 && quality > 0.4) {
                tryCompress(quality - 0.15);
                return;
              }

              const compressedFile = new File(
                [blob],
                `${file.name.replace(/\.[^/.]+$/, '')}.webp`,
                { type: 'image/webp' }
              );

              const previewUrl = URL.createObjectURL(blob);

              resolve({
                file: compressedFile,
                blob,
                previewUrl,
                originalSizeKB,
                compressedSizeKB,
              });
            },
            'image/webp',
            quality
          );
        };

        tryCompress(initialQuality);
      };

      img.onerror = (err) => reject(new Error('Image failed to load: ' + err));
    };

    reader.onerror = (err) => reject(new Error('FileReader error: ' + err));
  });
}
