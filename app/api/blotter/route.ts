import { NextResponse } from "next/server";
import prismaModule from "@/lib/prisma";

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule;

export async function GET() {
  try {
    const blotters = await prisma.blotter.findMany({
      include: {
        complainant: true,
        handledBy: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedBlotters = blotters.map((b) => ({
      id: b.id,
      complainant: [b.complainant.firstName, b.complainant.lastName].filter(Boolean).join(" "),
      respondentName: b.respondentName,
      incident: b.incident,
      location: b.location,
      date: b.date.toISOString(),
      status: b.status === "OPEN" ? "Open" : "Resolved",
      handledBy: b.handledBy
        ? [b.handledBy.firstName, b.handledBy.lastName].filter(Boolean).join(" ")
        : undefined,
      blotterImage: b.blotterImage,
    }));

    return NextResponse.json(formattedBlotters);
  } catch (error) {
    console.error("Failed to fetch blotters API", error);
    return NextResponse.json(
      { error: "Failed to fetch blotters" },
      { status: 500 }
    );
  }
}
