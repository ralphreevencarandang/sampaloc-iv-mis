import { NextResponse } from "next/server";
import { getBlottersFromDb } from "@/server/actions/blotter.actions";

export async function GET() {
  try {
    const formattedBlotters = await getBlottersFromDb();

    return NextResponse.json(formattedBlotters);
  } catch (error) {
    console.error("Failed to fetch blotters API", error);
    return NextResponse.json(
      { error: "Failed to fetch blotters" },
      { status: 500 }
    );
  }
}
