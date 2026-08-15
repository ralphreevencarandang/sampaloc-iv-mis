import { NextResponse } from "next/server";
import { bulkArchiveResidentsAction } from "@/server/actions/resident.actions";

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
        { success: false, message: "No resident IDs provided." },
        { status: 400 }
      );
    }

    const result = await bulkArchiveResidentsAction(ids);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("POST/PATCH /api/residents/bulk-archive failed", error);
    return NextResponse.json(
      { success: false, message: "Failed to archive residents." },
      { status: 500 }
    );
  }
}
