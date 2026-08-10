/**
 * Product-viewing tier resolution — typed.
 */

export const MIN_SPIN_FRAMES = 24;

export type ViewerTier = 'A' | 'B' | 'C' | 'D';

export interface ProductViewerSource {
  id?: string;
  image?: string;
  hoverImage?: string;
  gallery?: string[];
  colors?: Array<{ key?: string; image?: string } | null>;
  spin360?: string[];
  model3d?: string;
}

export interface ResolvedProductViewer {
  tier: ViewerTier;
  images: string[];
  frames: string[];
  model: string | null;
  placeholder: boolean;
}

/** Purpose-built catalogue concept artwork is never a verified product asset. */
export const isPlaceholderMedia = (src: unknown): boolean =>
  String(src || '').startsWith('/images/catalog/');

export function verifiedImages(product?: ProductViewerSource | null): string[] {
  const source = product || {};
  const gallery = Array.isArray(source.gallery) ? source.gallery : [];
  const colourImages = Array.isArray(source.colors)
    ? source.colors.map((colour) => colour && colour.image).filter(Boolean)
    : [];
  const all = [source.image, source.hoverImage, ...colourImages, ...gallery]
    .filter(Boolean)
    .map(String);
  const unique: string[] = [];
  for (const src of all) {
    if (!unique.includes(src) && !isPlaceholderMedia(src)) unique.push(src);
  }
  return unique;
}

export function spinFrames(product?: ProductViewerSource | null): string[] {
  const frames = product && Array.isArray(product.spin360) ? product.spin360.filter(Boolean) : [];
  return frames.length >= MIN_SPIN_FRAMES ? frames.map(String) : [];
}

export function resolveProductViewer(product?: ProductViewerSource | null): ResolvedProductViewer {
  const source = product || {};
  const images = verifiedImages(source);
  const frames = spinFrames(source);
  const model =
    typeof source.model3d === 'string' && source.model3d.startsWith('/models/')
      ? source.model3d
      : null;

  let tier: ViewerTier = 'D';
  if (model) tier = 'A';
  else if (frames.length > 0) tier = 'B';
  else if (images.length >= 2) tier = 'C';

  return {
    tier,
    images,
    frames,
    model,
    placeholder: isPlaceholderMedia(source.image),
  };
}
