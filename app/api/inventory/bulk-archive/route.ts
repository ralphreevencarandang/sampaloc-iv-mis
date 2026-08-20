import { NextResponse } from "next/server";
import { bulkArchiveInventoryItemsAction } from "@/server/actions/inventory.actions";

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
        { success: false, message: "No inventory IDs provided." },
        { status: 400 }
      );
    }

    const result = await bulkArchiveInventoryItemsAction(ids);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("POST/PATCH /api/inventory/bulk-archive failed", error);
    return NextResponse.json(
      { success: false, message: "Failed to archive inventory items." },
      { status: 500 }
    );
  }
}
