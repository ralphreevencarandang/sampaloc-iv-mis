import { NextResponse } from "next/server";
import { getVawcFromDb } from "@/server/actions/vawc.actions";

export async function GET() {
  try {
    const records = await getVawcFromDb();
    return NextResponse.json(records);
  } catch (error) {
    console.error("Failed to fetch VAWC API", error);
    return NextResponse.json(
      { error: "Failed to fetch VAWC cases" },
      { status: 500 }
    );
  }
}
