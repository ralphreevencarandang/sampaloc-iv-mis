import { NextResponse } from "next/server";
import { getBlottersFromDb } from "@/server/actions/blotter.actions";
import { forbiddenUnlessAdminCan } from "@/lib/api-authorization";

export async function GET() {
  const forbidden = await forbiddenUnlessAdminCan("blotter");
  if (forbidden) return forbidden;

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
