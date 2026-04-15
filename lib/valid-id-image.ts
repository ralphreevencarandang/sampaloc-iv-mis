export const MAX_VALID_ID_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_VALID_ID_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const allowedImageTypeSet = new Set(ALLOWED_VALID_ID_IMAGE_TYPES);

export function getValidIdImageSizeErrorMessage(maxSizeBytes = MAX_VALID_ID_IMAGE_SIZE_BYTES) {
  const maxSizeMb = Math.floor(maxSizeBytes / (1024 * 1024));
  return `Valid ID image size must be ${maxSizeMb}MB or less.`;
}

export function getValidIdImageTypeErrorMessage() {
  return "Valid ID must be a JPG, PNG, or WebP image.";
}

export function validateValidIdImageFile(file: File) {
  if (!allowedImageTypeSet.has(file.type as (typeof ALLOWED_VALID_ID_IMAGE_TYPES)[number])) {
    return getValidIdImageTypeErrorMessage();
  }

  if (file.size > MAX_VALID_ID_IMAGE_SIZE_BYTES) {
    return getValidIdImageSizeErrorMessage();
  }

  return null;
}
