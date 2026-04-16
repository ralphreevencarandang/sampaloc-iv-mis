import { NextResponse } from "next/server";
import { fetchAnnouncementsFromDb } from "@/server/announcements/announcements";

export async function GET() {
  try {
    const announcements = await fetchAnnouncementsFromDb();

    return NextResponse.json(announcements);
  } catch (error) {
    console.error("GET /api/announcements failed", error);

    return NextResponse.json(
      { message: "Failed to fetch announcements." },
      { status: 500 }
    );
  }
}
