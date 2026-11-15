import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbiddenUnlessAdminCan } from "@/lib/api-authorization";

export async function GET(request: Request) {
  const forbidden = await forbiddenUnlessAdminCan("residents");
  if (forbidden) return forbidden;

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
        subdivision: true,
        phase: true,
        contactNumber: true,
        occupation: true,
        citizenship: true,
        isVoter: true,
        precinctNumber: true,
        is4Ps: true,
        isPwd: true,
        pwdCondition: true,
        isArchived: true,
        status: true,
        householdMemberships: {
          where: { removedAt: null },
          take: 1,
          select: { householdId: true, household: { select: { number: true } } },
        },
      },
    });
    return NextResponse.json(residents.map(({ householdMemberships, ...resident }) => ({
      ...resident,
      householdId: householdMemberships[0]?.householdId ?? null,
      householdNumber: householdMemberships[0]?.household.number ?? null,
    })));
  } catch (error) {
    console.error("Failed to fetch residents:", error);
    return NextResponse.json(
      { error: "Failed to fetch residents" },
      { status: 500 }
    );
  }
}
