/**
 * Product-viewing tier resolution.
 *
 * The same rules the offline audit uses (`scripts/generate-product-viewer-matrix.mjs`),
 * expressed for the runtime so the two can never drift. Tiers describe what the
 * ASSETS can honestly support:
 *
 *   A  real-time 3D      a verified, optimised model exists
 *   B  true 360 spinset  at least MIN_SPIN_FRAMES real photographed frames exist
 *   C  multi-angle       several verified images, not enough for a true 360
 *   D  asset-blocked     one image, or purpose-built placeholder concept art
 *
 * Nothing here fabricates geometry, duplicates a frame, or lets a single image
 * masquerade as a rotation. This module is deliberately free of any pricing,
 * inventory or cart concern.
 */

export const MIN_SPIN_FRAMES = 24;

/** Purpose-built catalogue concept artwork is never a verified product asset. */
export const isPlaceholderMedia = (src) => String(src || '').startsWith('/images/catalog/');

/**
 * Every distinct, verified image a product owns, in display order.
 * @param {any} [product]
 * @returns {string[]}
 */
export function verifiedImages(product) {
  const source = product || {};
  const gallery = Array.isArray(source.gallery) ? source.gallery : [];
  const all = [source.image, source.hoverImage, ...gallery].filter(Boolean).map(String);
  const unique = [];
  for (const src of all) {
    if (!unique.includes(src) && !isPlaceholderMedia(src)) unique.push(src);
  }
  return unique;
}

/**
 * Real turntable frames a product declares. Absent or short sequences are not
 * padded, repeated or interpolated — a partial spin is not a spin.
 * @param {any} [product]
 * @returns {string[]}
 */
export function spinFrames(product) {
  const frames = product && Array.isArray(product.spin360) ? product.spin360.filter(Boolean) : [];
  return frames.length >= MIN_SPIN_FRAMES ? frames.map(String) : [];
}

/**
 * @param {any} [product]
 * @returns {{ tier: 'A'|'B'|'C'|'D', images: string[], frames: string[], model: string|null, placeholder: boolean }}
 */
export function resolveProductViewer(product) {
  const source = product || {};
  const images = verifiedImages(source);
  const frames = spinFrames(source);
  const model =
    typeof source.model3d === 'string' && source.model3d.startsWith('/models/')
      ? source.model3d
      : null;

  /** @type {'A'|'B'|'C'|'D'} */
  let tier = 'D';
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
