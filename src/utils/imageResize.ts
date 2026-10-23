/**
 * Reads an image file and returns a data URL, downscaled so it fits comfortably
 * inside a MySQL packet (full-size phone photos are often 5-10MB as base64).
 */
export function readImageAsDataUrl(file: File, maxDim = 1280, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc file ảnh'));
    reader.onload = () => {
      const original = reader.result as string;
      // Small GIFs keep their animation
      if (file.type === 'image/gif' && file.size < 2 * 1024 * 1024) return resolve(original);

      const img = new Image();
      img.onerror = () => resolve(original); // fall back to the raw data
      img.onload = () => {
        try {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          if (scale === 1 && file.size < 800 * 1024) return resolve(original);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(original);
          const keepPng = file.type === 'image/png';
          if (!keepPng) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(keepPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', quality));
        } catch {
          resolve(original);
        }
      };
      img.src = original;
    };
    reader.readAsDataURL(file);
  });
}
