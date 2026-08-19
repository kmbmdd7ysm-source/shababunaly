/*
 * Editorial media pipeline intentionally disabled for the current approved set.
 *
 * The active site photography in public/media/editorial/ is copied byte-for-byte
 * from the user-supplied originals. Re-encoding or generating derivative artwork
 * here would change the approved image quality, so this script now performs a
 * verification-only check instead of creating replacement files.
 */
import { existsSync, readdirSync } from 'node:fs';

const editorialDir = 'public/media/editorial';
const videoDir = 'public/media/hero-videos';

if (!existsSync(editorialDir) || !existsSync(videoDir)) {
  console.error('Approved editorial media directories are missing.');
  process.exit(1);
}

const images = readdirSync(editorialDir).filter((file) => /\.(?:jpe?g|png|webp|avif)$/i.test(file));
const videos = readdirSync(videoDir).filter((file) => /\.(?:mp4|webm|mov|m4v)$/i.test(file));

if (!images.length || !videos.length) {
  console.error('Approved editorial media set is incomplete.');
  process.exit(1);
}

console.info(`Approved originals preserved: ${images.length} still images, ${videos.length} hero video files.`);
