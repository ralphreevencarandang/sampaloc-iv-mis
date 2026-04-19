import { NextResponse } from "next/server";
import { getVawcById } from "@/server/actions/vawc.actions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const record = await getVawcById(resolvedParams.id);
    if (!record) {
       return NextResponse.json({ error: "VAWC record not found" }, { status: 404 });
    }
    return NextResponse.json(record);
  } catch (error) {
    console.error("Failed to fetch VAWC API by ID", error);
    return NextResponse.json(
      { error: "Failed to fetch VAWC case" },
      { status: 500 }
    );
  }
}
