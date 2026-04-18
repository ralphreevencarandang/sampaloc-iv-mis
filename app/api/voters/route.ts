import { NextResponse } from "next/server";
import prismaModule from "@/lib/prisma";

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule;

export async function GET() {
  try {
    const voters = await prisma.resident.findMany({
      where: {
        isVoter: true,
      },
      select: {
        id: true,
        
        precinctNumber: true,
        firstName: true,
        lastName: true,
        middleName: true,
        email: true,
        birthDate: true,
        street: true,
        houseNumber: true,
        gender: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(voters);
  } catch (error) {
    console.error("[VOTERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
