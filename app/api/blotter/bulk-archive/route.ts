import { NextResponse } from "next/server";
import { bulkArchiveBlottersAction } from "@/server/actions/archive.actions";

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
        { success: false, message: "No blotter IDs provided." },
        { status: 400 }
      );
    }

    const result = await bulkArchiveBlottersAction(ids);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("POST/PATCH /api/blotter/bulk-archive failed", error);
    return NextResponse.json(
      { success: false, message: "Failed to archive blotter records." },
      { status: 500 }
    );
  }
}
