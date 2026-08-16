import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateAge } from "@/lib/resident-demographics";
import { forbiddenUnlessAdminCan } from "@/lib/api-authorization";

export async function GET() {
  const forbidden = await forbiddenUnlessAdminCan("dashboard");
  if (forbidden) return forbidden;

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
    let adultCount = 0;
    let seniorCount = 0;

    for (const r of residents) {
      if (r.isVoter) votersCount++;
      
      const genderLow = r.gender.toLowerCase();
      if (genderLow === "male") {
        maleCount++;
      } else if (genderLow === "female") {
        femaleCount++;
      }

      const age = calculateAge(r.birthDate);

      if (age <= 17) {
        minorCount++;
      } else if (age >= 60) {
        seniorCount++;
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
        adult: adultCount,
        senior: seniorCount,
      },
      totalMinors: minorCount,
      totalSeniors: seniorCount,
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
