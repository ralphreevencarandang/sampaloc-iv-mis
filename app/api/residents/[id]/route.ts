import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    const resident = await prisma.resident.findUnique({
      where: { id },
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
        validIDImage: true,
        status: true,
        createdAt: true,
      },
    });

    if (!resident) {
      return NextResponse.json(
        { message: "Resident not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(resident);
  } catch (error) {
    console.error("Failed to fetch resident:", error);

    return NextResponse.json(
      { message: "Failed to fetch resident." },
      { status: 500 }
    );
  }
}
