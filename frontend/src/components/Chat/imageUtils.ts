import type { ImageAttachment } from '../../types';

export const MAX_IMAGES = 4;
export const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB per image
export const MAX_TOTAL_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB combined
export const ACCEPTED_TYPES = ['image/png', 'image/jpeg'];
export const SAFE_MIME_TYPES = new Set(['image/png', 'image/jpeg']);

export function createBlobUrl(img: ImageAttachment): string {
  if (!SAFE_MIME_TYPES.has(img.mimeType)) return '';
  try {
    const binary = atob(img.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: img.mimeType });
    return URL.createObjectURL(blob);
  } catch {
    return '';
  }
}

export function fileToImageAttachment(file: File): Promise<ImageAttachment> {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      reject(new Error('Only PNG and JPEG images are supported'));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      reject(new Error('Image must be under 4MB'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve({ base64, mimeType: file.type as 'image/png' | 'image/jpeg' });
    };
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });
}

function estimateBase64Bytes(base64: string): number {
  const normalized = base64.replace(/\s/g, '');
  return Math.floor((normalized.length * 3) / 4);
}

export function validateAttachments(images: ImageAttachment[]): string | null {
  if (images.length > MAX_IMAGES) return `You can attach up to ${MAX_IMAGES} images.`;

  let totalBytes = 0;
  for (const img of images) {
    const estimated = estimateBase64Bytes(img.base64);
    if (estimated > MAX_IMAGE_SIZE) return 'Each image must be under 4MB.';
    totalBytes += estimated;
  }

  if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
    return 'Images together must stay under 8MB.';
  }

  return null;
}
