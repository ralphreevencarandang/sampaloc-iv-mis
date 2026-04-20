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

    const documentRequests = await prisma.documentRequest.findMany({
      where: { residentId: id },
      select: {
        id: true,
        type: true,
        purpose: true,
        status: true,
        requestedAt: true,
        releasedAt: true,
        approvedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        requestedAt: "desc",
      },
    });

    return NextResponse.json(
      documentRequests.map((record) => ({
        id: record.id,
        type: record.type,
        purpose: record.purpose,
        status: record.status,
        requestedAt: record.requestedAt.toISOString(),
        releasedAt: record.releasedAt ? record.releasedAt.toISOString() : null,
        approvedByName: record.approvedBy
          ? [record.approvedBy.firstName, record.approvedBy.lastName].filter(Boolean).join(" ")
          : null,
      }))
    );
  } catch (error) {
    console.error("Failed to fetch resident documents:", error);
    return NextResponse.json(
      { message: "Failed to fetch resident documents." },
      { status: 500 }
    );
  }
}
