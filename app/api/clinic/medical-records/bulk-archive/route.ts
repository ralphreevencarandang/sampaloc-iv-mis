import { NextResponse } from "next/server";
import { bulkArchiveMedicalRecordsAction } from "@/server/actions/archive.actions";

export async function POST(request: Request) {
  return handleBulkArchive(request);
}

export async function PATCH(request: Request) {
  return handleBulkArchive(request);
}

async function handleBulkArchive(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, message: "No medical record IDs provided." },
        { status: 400 }
      );
    }

    const result = await bulkArchiveMedicalRecordsAction(ids);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("POST/PATCH /api/clinic/medical-records/bulk-archive failed", error);
    return NextResponse.json(
      { success: false, message: "Failed to archive medical records." },
      { status: 500 }
    );
  }
}
