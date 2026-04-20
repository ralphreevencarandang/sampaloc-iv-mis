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

    const pets = await prisma.pet.findMany({
      where: { ownerId: id },
      select: {
        id: true,
        name: true,
        type: true,
        breed: true,
        color: true,
        vaccinationDate: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      pets.map((record) => ({
        id: record.id,
        name: record.name,
        type: record.type,
        breed: record.breed,
        color: record.color,
        vaccinationDate: record.vaccinationDate ? record.vaccinationDate.toISOString() : null,
        createdAt: record.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Failed to fetch resident pets:", error);
    return NextResponse.json(
      { message: "Failed to fetch resident pets." },
      { status: 500 }
    );
  }
}
