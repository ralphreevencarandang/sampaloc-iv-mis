import { v2 as cloudinary, type UploadApiResponse, type UploadApiErrorResponse } from "cloudinary";
import {
  getValidIdImageSizeErrorMessage,
  getValidIdImageTypeErrorMessage,
  validateValidIdImageFile,
} from "@/lib/valid-id-image";
const CLOUDINARY_FOLDER = "uploads";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class CloudinaryUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloudinaryUploadError";
  }
}

type ImageUploadOptions = {
  folder?: string;
  publicIdPrefix?: string;
  assetLabel?: string;
};

function getAssetLabel(assetLabel?: string) {
  return assetLabel?.trim() || "Image";
}

function getUploadFailedMessage(assetLabel?: string) {
  return `Uploading the ${getAssetLabel(assetLabel).toLowerCase()} failed.`;
}

function getMissingUrlMessage(assetLabel?: string) {
  return `Cloudinary did not return a secure URL for the ${getAssetLabel(assetLabel).toLowerCase()}.`;
}

function ensureCloudinaryConfig() {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new CloudinaryUploadError("Image upload is not configured.");
  }
}

export function validateImageFile(file: File, assetLabel?: string) {
  const validationError = validateValidIdImageFile(file);
  const label = getAssetLabel(assetLabel);

  if (validationError === getValidIdImageTypeErrorMessage()) {
    throw new CloudinaryUploadError(
      validationError.replace("Valid ID", label)
    );
  }

  if (validationError === getValidIdImageSizeErrorMessage()) {
    throw new CloudinaryUploadError(
      validationError.replace("Valid ID image", label)
    );
  }

  if (validationError) {
    throw new CloudinaryUploadError(validationError);
  }
}

export async function uploadImageToCloudinary(
  file: File,
  options?: ImageUploadOptions
) {
  ensureCloudinaryConfig();
  validateImageFile(file, options?.assetLabel);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const folder = options?.folder ?? CLOUDINARY_FOLDER;

  return new Promise<UploadApiResponse>((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        overwrite: false,
        unique_filename: true,
        use_filename: false,
        public_id_prefix: options?.publicIdPrefix,
      },
      (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
        if (error) {
          reject(new CloudinaryUploadError(getUploadFailedMessage(options?.assetLabel)));
          return;
        }

        if (!result?.secure_url) {
          reject(new CloudinaryUploadError(getMissingUrlMessage(options?.assetLabel)));
          return;
        }

        resolve(result);
      }
    );

    upload.on("error", () => {
      reject(new CloudinaryUploadError(getUploadFailedMessage(options?.assetLabel)));
    });

    upload.end(buffer);
  });
}

export default cloudinary;
