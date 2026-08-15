import { NextResponse } from "next/server";
import { bulkArchivePetsAction } from "@/server/actions/archive.actions";

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
        { success: false, message: "No pet IDs provided." },
        { status: 400 }
      );
    }

    const result = await bulkArchivePetsAction(ids);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("POST/PATCH /api/pets/bulk-archive failed", error);
    return NextResponse.json(
      { success: false, message: "Failed to archive pets." },
      { status: 500 }
    );
  }
}
