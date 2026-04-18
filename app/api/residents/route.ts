import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const archived = searchParams.get("archived") === "true";

    const residents = await prisma.resident.findMany({
      where: {
        isArchived: archived,
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
      },
    });
    return NextResponse.json(residents);
  } catch (error) {
    console.error("Failed to fetch residents:", error);
    return NextResponse.json(
      { error: "Failed to fetch residents" },
      { status: 500 }
    );
  }
}
