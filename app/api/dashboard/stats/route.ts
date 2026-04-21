import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      residents,
      vawcCount,
      blotterCount,
      docRequestCount,
      activeAnnouncementsCount,
      officialsCount,
    ] = await Promise.all([
      prisma.resident.findMany({
        where: { isArchived: false, status: "APPROVED" },
        select: { gender: true, birthDate: true, isVoter: true },
      }),
      prisma.vawcRecord.count({ where: { isArchive: false } }),
      prisma.blotter.count({ where: { isArchive: false } }),
      prisma.documentRequest.count(),
      prisma.announcement.count({ where: { isArchive: false } }),
      prisma.official.count({ where: { isArchive: false, isActive: true } }),
    ]);

    let votersCount = 0;
    let maleCount = 0;
    let femaleCount = 0;
    let minorCount = 0;
    let teenCount = 0;
    let adultCount = 0;

    const today = new Date();

    for (const r of residents) {
      if (r.isVoter) votersCount++;
      
      const genderLow = r.gender.toLowerCase();
      if (genderLow === "male") {
        maleCount++;
      } else if (genderLow === "female") {
        femaleCount++;
      }

      // Calculate age
      let age = today.getFullYear() - r.birthDate.getFullYear();
      const m = today.getMonth() - r.birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < r.birthDate.getDate())) {
        age--;
      }

      if (age <= 12) {
        minorCount++;
      } else if (age >= 13 && age <= 17) {
        teenCount++;
      } else {
        adultCount++;
      }
    }

    return NextResponse.json({
      totalResidents: residents.length,
      totalVoters: votersCount,
      genderDistribution: {
        male: maleCount,
        female: femaleCount,
      },
      ageGroups: {
        minor: minorCount,
        teen: teenCount,
        adult: adultCount,
      },
      totalVawc: vawcCount,
      totalBlotters: blotterCount,
      totalDocumentRequests: docRequestCount,
      activeAnnouncements: activeAnnouncementsCount,
      barangayOfficials: officialsCount,
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return NextResponse.json(
      { message: "Failed to fetch dashboard stats." },
      { status: 500 }
    );
  }
}
