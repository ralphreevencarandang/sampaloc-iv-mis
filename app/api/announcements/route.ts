import { NextResponse } from "next/server";
import { fetchAnnouncementsFromDb } from "@/server/announcements/announcements";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const archived = searchParams.get("archived") === "true";
    const announcements = await fetchAnnouncementsFromDb({ archived });

    return NextResponse.json(announcements);
  } catch (error) {
    console.error("GET /api/announcements failed", error);

    return NextResponse.json(
      { message: "Failed to fetch announcements." },
      { status: 500 }
    );
  }
}
