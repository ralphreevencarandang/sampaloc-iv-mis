import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const residents = await prisma.resident.findMany({
      orderBy: { createdAt: "desc" },
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