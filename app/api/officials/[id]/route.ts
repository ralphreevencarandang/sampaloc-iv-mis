import { NextResponse } from "next/server";
import prismaModule from "@/lib/prisma";
import { mapOfficialRecord } from "@/server/officials/officials";

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    const official = await prisma.official.findUnique({
      where: { id },
    });

    if (!official) {
      return NextResponse.json(
        { message: "Official not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(mapOfficialRecord(official));
  } catch (error) {
    console.error("Failed to fetch official:", error);

    return NextResponse.json(
      { message: "Failed to fetch official." },
      { status: 500 }
    );
  }
}
