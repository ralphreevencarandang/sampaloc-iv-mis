import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const residents = await prisma.resident.findMany({
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
