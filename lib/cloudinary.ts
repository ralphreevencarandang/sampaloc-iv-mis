import { v2 as cloudinary, type UploadApiResponse, type UploadApiErrorResponse } from "cloudinary";
import {
  getValidIdImageSizeErrorMessage,
  getValidIdImageTypeErrorMessage,
  validateValidIdImageFile,
} from "@/lib/valid-id-image";
const CLOUDINARY_FOLDER = "residents/valid-id";

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

function ensureCloudinaryConfig() {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new CloudinaryUploadError("Image upload is not configured.");
  }
}

export function validateImageFile(file: File) {
  const validationError = validateValidIdImageFile(file);

  if (validationError === getValidIdImageTypeErrorMessage()) {
    throw new CloudinaryUploadError(validationError);
  }

  if (validationError === getValidIdImageSizeErrorMessage()) {
    throw new CloudinaryUploadError(validationError);
  }

  if (validationError) {
    throw new CloudinaryUploadError(validationError);
  }
}

export async function uploadImageToCloudinary(
  file: File,
  options?: {
    folder?: string;
    publicIdPrefix?: string;
  }
) {
  ensureCloudinaryConfig();
  validateImageFile(file);

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
          reject(new CloudinaryUploadError("Uploading the valid ID failed."));
          return;
        }

        if (!result?.secure_url) {
          reject(new CloudinaryUploadError("Cloudinary did not return a secure image URL."));
          return;
        }

        resolve(result);
      }
    );

    upload.on("error", () => {
      reject(new CloudinaryUploadError("Uploading the valid ID failed."));
    });

    upload.end(buffer);
  });
}

export default cloudinary;
