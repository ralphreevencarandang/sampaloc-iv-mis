import { NextResponse } from "next/server";
import { fetchAnnouncementsFromDb } from "@/server/announcements/announcements";
import { fetchOfficialsFromDb } from "@/server/officials/officials";
import { getBlottersFromDb } from "@/server/actions/blotter.actions";
import { getVawcFromDb } from "@/server/actions/vawc.actions";
import { getPetsFromDb } from "@/server/actions/pet.action";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "announcements") {
      const announcements = await fetchAnnouncementsFromDb({ archived: true });
      return NextResponse.json(announcements);
    }

    if (type === "residents") {
      const residents = await prisma.resident.findMany({
        where: {
          isArchived: true,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          middleName: true,
          birthDate: true,
          gender: true,
          civilStatus: true,
          street: true,
          houseNumber: true,
          contactNumber: true,
          occupation: true,
          citizenship: true,
          isVoter: true,
          precinctNumber: true,
          isArchived: true,
          status: true,
          createdAt: true,
        },
      });
      return NextResponse.json(residents);
    }

    if (type === "officials") {
      const officials = await fetchOfficialsFromDb({ archived: true });
      return NextResponse.json(officials);
    }

    if (type === "blotters") {
      const blotters = await getBlottersFromDb({ archived: true });
      return NextResponse.json(blotters);
    }
    
    if (type === "vawc") {
      const vawcCases = await getVawcFromDb({ archived: true });
      return NextResponse.json(vawcCases);
    }

    if (type === "pets") {
      const pets = await getPetsFromDb({ archived: true });
      return NextResponse.json(pets);
    }
    
    // Fallback for other mock entities at the moment
    return NextResponse.json([]);
  } catch (error) {
    console.error("GET /api/archives failed", error);

    return NextResponse.json(
      { message: "Failed to fetch archived records." },
      { status: 500 }
    );
  }
}
