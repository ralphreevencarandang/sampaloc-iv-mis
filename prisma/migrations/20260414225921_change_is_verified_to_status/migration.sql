/*
  Warnings:

  - You are about to drop the column `is4PsBeneficiary` on the `Resident` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "image" TEXT;

-- AlterTable
ALTER TABLE "Resident" DROP COLUMN "is4PsBeneficiary",
ADD COLUMN     "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "validIDImage" TEXT;
