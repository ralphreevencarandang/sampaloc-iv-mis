import { NextResponse } from "next/server";
import { fetchOfficialsFromDb } from "@/server/officials/officials";

export async function GET() {
  try {
    const officials = await fetchOfficialsFromDb();

    return NextResponse.json(officials);
  } catch (error) {
    console.error("GET /api/officials failed", error);

    return NextResponse.json(
      { message: "Failed to fetch officials." },
      { status: 500 }
    );
  }
}
