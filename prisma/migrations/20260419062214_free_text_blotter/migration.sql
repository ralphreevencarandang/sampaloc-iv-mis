/*
  Warnings:

  - Added the required column `complainantName` to the `Blotter` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VawcStatus" AS ENUM ('REPORTED', 'SUMMONED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "AbuseType" AS ENUM ('PHYSICAL', 'SEXUAL', 'PSYCHOLOGICAL', 'ECONOMIC');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('SPOUSE', 'FORMER_SPOUSE', 'LIVE_IN', 'DATING', 'FORMER_DATING', 'OTHER');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELED');

-- DropForeignKey
ALTER TABLE "Blotter" DROP CONSTRAINT "Blotter_complainantId_fkey";

-- AlterTable
ALTER TABLE "Blotter" ADD COLUMN     "complainantName" TEXT NOT NULL,
ALTER COLUMN "complainantId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "VawcRecord" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "victimName" TEXT NOT NULL,
    "victimAge" INTEGER NOT NULL,
    "victimSex" TEXT NOT NULL,
    "victimCivilStatus" TEXT NOT NULL,
    "victimAddress" TEXT NOT NULL,
    "victimContactNumber" TEXT,
    "isMinor" BOOLEAN NOT NULL DEFAULT false,
    "guardianName" TEXT,
    "respondentName" TEXT NOT NULL,
    "respondentAge" INTEGER NOT NULL,
    "respondentSex" TEXT NOT NULL,
    "respondentAddress" TEXT NOT NULL,
    "respondentContactNumber" TEXT,
    "respondentOccupation" TEXT,
    "relationshipToVictim" "RelationshipType" NOT NULL,
    "abuseType" "AbuseType" NOT NULL,
    "narrative" TEXT NOT NULL,
    "incidentDate" TIMESTAMP(3) NOT NULL,
    "incidentLocation" TEXT NOT NULL,
    "vawcImage" TEXT,
    "status" "VawcStatus" NOT NULL DEFAULT 'REPORTED',
    "isArchive" BOOLEAN NOT NULL DEFAULT false,
    "blotterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VawcRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VawcStatusHistory" (
    "id" TEXT NOT NULL,
    "vawcRecordId" TEXT NOT NULL,
    "status" "VawcStatus" NOT NULL,
    "remarks" TEXT,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VawcStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VawcSchedule" (
    "id" TEXT NOT NULL,
    "vawcRecordId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VawcSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VawcRecord_caseNumber_key" ON "VawcRecord"("caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VawcRecord_blotterId_key" ON "VawcRecord"("blotterId");

-- AddForeignKey
ALTER TABLE "Blotter" ADD CONSTRAINT "Blotter_complainantId_fkey" FOREIGN KEY ("complainantId") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VawcRecord" ADD CONSTRAINT "VawcRecord_blotterId_fkey" FOREIGN KEY ("blotterId") REFERENCES "Blotter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VawcStatusHistory" ADD CONSTRAINT "VawcStatusHistory_vawcRecordId_fkey" FOREIGN KEY ("vawcRecordId") REFERENCES "VawcRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VawcSchedule" ADD CONSTRAINT "VawcSchedule_vawcRecordId_fkey" FOREIGN KEY ("vawcRecordId") REFERENCES "VawcRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
