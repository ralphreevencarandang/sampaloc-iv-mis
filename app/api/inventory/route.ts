import { NextResponse } from "next/server";
import { forbiddenUnlessAdminCan } from "@/lib/api-authorization";
import { getInventoryFromDb } from "@/server/actions/inventory.actions";

export async function GET(request: Request) {
  const forbidden = await forbiddenUnlessAdminCan("inventory");
  if (forbidden) return forbidden;

  try {
    const { searchParams } = new URL(request.url);
    const archived = searchParams.get("archived") === "true";
    const items = await getInventoryFromDb({ archived });

    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/inventory failed", error);

    return NextResponse.json(
      { message: "Failed to fetch inventory items." },
      { status: 500 }
    );
  }
}
