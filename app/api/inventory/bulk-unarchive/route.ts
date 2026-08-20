import { NextResponse } from "next/server";
import { bulkUnarchiveInventoryItemsAction } from "@/server/actions/inventory.actions";

export async function POST(request: Request) {
  return handleBulkUnarchive(request);
}

export async function PATCH(request: Request) {
  return handleBulkUnarchive(request);
}

async function handleBulkUnarchive(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, message: "No inventory IDs provided." },
        { status: 400 }
      );
    }

    const result = await bulkUnarchiveInventoryItemsAction(ids);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("POST/PATCH /api/inventory/bulk-unarchive failed", error);
    return NextResponse.json(
      { success: false, message: "Failed to restore inventory items." },
      { status: 500 }
    );
  }
}
