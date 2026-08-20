import { NextResponse } from "next/server";
import { uploadImageToCloudinary, CloudinaryUploadError } from "@/lib/cloudinary";
import { getCurrentResidentFromSession } from "@/lib/resident-session";
import { hasAdminPermission } from "@/lib/admin-authorization";

export async function POST(request: Request) {
  try {
    const currentResident = await getCurrentResidentFromSession();
    const isAdmin = await hasAdminPermission("residents", "write");

    if (!currentResident && !isAdmin) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = (formData.get("image") ?? formData.get("file")) as File | null;

    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { message: "Image file is required." },
        { status: 400 }
      );
    }

    const uploadResult = await uploadImageToCloudinary(file, {
      folder: "residents/profile-pictures",
      publicIdPrefix: "resident_avatar",
      assetLabel: "Profile picture",
    });

    return NextResponse.json({
      url: uploadResult.secure_url,
      secure_url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
    });
  } catch (error) {
    if (error instanceof CloudinaryUploadError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    console.error("Profile picture upload failed:", error);
    return NextResponse.json(
      { message: "Failed to upload profile picture." },
      { status: 500 }
    );
  }
}
