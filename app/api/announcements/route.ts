import { NextResponse } from "next/server";
import { fetchAnnouncementsFromDb } from "@/server/announcements/announcements";
import { forbiddenUnlessAdminCan } from "@/lib/api-authorization";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const archived = searchParams.get("archived") === "true";

    if (archived) {
      const forbidden = await forbiddenUnlessAdminCan("announcements");
      if (forbidden) return forbidden;
    }

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
