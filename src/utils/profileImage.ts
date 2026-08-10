const SIGNATURES = {
  jpeg: (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: (b: Uint8Array) =>
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a,
  webp: (b: Uint8Array) =>
    String.fromCharCode(...b.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...b.slice(8, 12)) === 'WEBP',
};

export const PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PROFILE_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const PROFILE_IMAGE_TARGET_BYTES = 180 * 1024;

export async function validateProfileImage(
  file: File | null | undefined,
): Promise<{ valid: boolean; reason?: string }> {
  if (!file || !String(file.type || '').startsWith('image/'))
    return { valid: false, reason: 'type' };
  if (file.size > PROFILE_IMAGE_MAX_BYTES) return { valid: false, reason: 'size' };
  if (!PROFILE_IMAGE_TYPES.includes(file.type)) return { valid: true };
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const signatureValid =
    (file.type === 'image/jpeg' && SIGNATURES.jpeg(bytes)) ||
    (file.type === 'image/png' && SIGNATURES.png(bytes)) ||
    (file.type === 'image/webp' && SIGNATURES.webp(bytes));
  return signatureValid ? { valid: true } : { valid: false, reason: 'signature' };
}

interface DrawableSource {
  drawable: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
}

function loadImageElement(file: Blob): Promise<DrawableSource> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ drawable: image, width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('invalid_profile_image'));
    };
    image.src = url;
  });
}

async function loadDrawable(file: Blob): Promise<DrawableSource> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        drawable: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close?.(),
      };
    } catch {
      // Safari/iOS can reject createImageBitmap for a photo it can still decode in <img>.
    }
  }
  return loadImageElement(file);
}

function approximateDataUrlBytes(dataUrl: string): number {
  const payload = String(dataUrl).split(',')[1] || '';
  return Math.ceil((payload.length * 3) / 4);
}

function renderDataUrl(source: DrawableSource, maxSide: number, quality: number): string {
  const longestSide = Math.max(source.width, source.height);
  const scale = Math.min(1, maxSide / longestSide);
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('profile_image_processing_unavailable');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(source.drawable, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

export async function createProfileImageDataUrl(
  file: File,
  maxSide = 256,
  quality = 0.76,
): Promise<string> {
  const source = await loadDrawable(file);
  try {
    const attempts: Array<[number, number]> = [
      [maxSide, quality],
      [240, 0.7],
      [224, 0.64],
      [192, 0.58],
    ];
    let last = '';
    for (const [side, nextQuality] of attempts) {
      last = renderDataUrl(source, Math.min(maxSide, side), nextQuality);
      if (approximateDataUrlBytes(last) <= PROFILE_IMAGE_TARGET_BYTES) return last;
    }
    return last;
  } finally {
    source.close?.();
  }
}
