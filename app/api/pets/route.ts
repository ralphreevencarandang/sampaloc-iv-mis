import { NextResponse } from "next/server";
import { getPetsFromDb } from "@/server/actions/pet.action";
import { forbiddenUnlessAdminCan } from "@/lib/api-authorization";

export async function GET(request: Request) {
  const forbidden = await forbiddenUnlessAdminCan("pets");
  if (forbidden) return forbidden;

  try {
    const { searchParams } = new URL(request.url);
    const archived = searchParams.get("archived") === "true";
    const pets = await getPetsFromDb({ archived });

    return NextResponse.json(pets);
  } catch (error) {
    console.error("GET /api/pets failed", error);

    return NextResponse.json(
      { message: "Failed to fetch pets." },
      { status: 500 }
    );
  }
}
