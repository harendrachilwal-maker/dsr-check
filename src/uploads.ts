import { imageType, MAX_BYTES } from './extraction';
export const MAX_PHOTOS = 6;
// JSON/base64 adds about one third to the original photo sizes.
export const MAX_REQUEST_BYTES = 14 * 1024 * 1024;
export const SIZE_ERROR = 'Choose photos totalling no more than 10 MB.';
export function encodeImage(bytes: Uint8Array) {
  const mime = imageType(bytes);
  if (!mime) throw new Error('Choose JPEG, PNG or WebP DSR photos.');
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return `data:${mime};base64,${btoa(binary)}`;
}
export function parsePhotos(bytes: Uint8Array, contentType: string): string[] {
  if (!contentType.toLowerCase().startsWith('application/json')) {
    if (bytes.length > MAX_BYTES) throw new Error(SIZE_ERROR);
    return [encodeImage(bytes)]; // Retain support for a phone page opened before this update.
  }
  let body: unknown;
  try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new Error('Choose valid DSR photos.'); }
  const images = (body as { images?: unknown } | null)?.images;
  if (!Array.isArray(images) || images.length < 1 || images.length > MAX_PHOTOS) throw new Error('Choose between one and six photos of the same day’s DSR.');
  let total = 0;
  return images.map(image => {
    if (typeof image !== 'string') throw new Error('Choose valid DSR photos.');
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]*={0,2})$/.exec(image);
    if (!match) throw new Error('Choose JPEG, PNG or WebP DSR photos.');
    let binary: string;
    try { binary = atob(match[2]); } catch { throw new Error('Choose valid DSR photos.'); }
    total += binary.length;
    if (total > MAX_BYTES) throw new Error(SIZE_ERROR);
    const decoded = Uint8Array.from(binary, char => char.charCodeAt(0));
    if (imageType(decoded) !== match[1]) throw new Error('Choose JPEG, PNG or WebP DSR photos.');
    return image;
  });
}
