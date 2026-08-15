import { NextResponse } from "next/server";
import { bulkUnarchiveAnnouncementsAction } from "@/server/actions/announcement.actions";

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
        { success: false, message: "No announcement IDs provided." },
        { status: 400 }
      );
    }

    const result = await bulkUnarchiveAnnouncementsAction(ids);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("POST/PATCH /api/announcements/bulk-unarchive failed", error);
    return NextResponse.json(
      { success: false, message: "Failed to restore announcements." },
      { status: 500 }
    );
  }
}
