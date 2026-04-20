import { NextResponse } from "next/server";
import { getCurrentResidentFromSession } from "@/lib/resident-session";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const currentResident = await getCurrentResidentFromSession();
    const { id } = await params;

    if (!currentResident) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    if (currentResident.id !== id) {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const blotters = await prisma.blotter.findMany({
      where: { complainantId: id },
      select: {
        id: true,
        incident: true,
        location: true,
        respondentName: true,
        status: true,
        date: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      blotters.map((record) => ({
        id: record.id,
        incident: record.incident,
        location: record.location,
        respondentName: record.respondentName,
        status: record.status,
        date: record.date.toISOString(),
        createdAt: record.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Failed to fetch resident blotters:", error);
    return NextResponse.json(
      { message: "Failed to fetch resident blotters." },
      { status: 500 }
    );
  }
}
