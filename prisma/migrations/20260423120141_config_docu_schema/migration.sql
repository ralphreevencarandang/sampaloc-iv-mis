/*
  Warnings:

  - You are about to drop the column `approvedById` on the `DocumentRequest` table. All the data in the column will be lost.
  - You are about to drop the column `documentStatus` on the `DocumentRequest` table. All the data in the column will be lost.
  - You are about to drop the column `proofOfPayment` on the `DocumentRequest` table. All the data in the column will be lost.
  - You are about to drop the column `referenceNumber` on the `DocumentRequest` table. All the data in the column will be lost.
  - You are about to drop the column `rejectionReason` on the `DocumentRequest` table. All the data in the column will be lost.
  - Added the required column `documentTypeId` to the `DocumentRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `yearsOfResidency` to the `DocumentRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RequestStatus" ADD VALUE 'SUBMITTED';
ALTER TYPE "RequestStatus" ADD VALUE 'REJECTED';

-- DropForeignKey
ALTER TABLE "DocumentRequest" DROP CONSTRAINT "DocumentRequest_approvedById_fkey";

-- AlterTable
ALTER TABLE "DocumentRequest" DROP COLUMN "approvedById",
DROP COLUMN "documentStatus",
DROP COLUMN "proofOfPayment",
DROP COLUMN "referenceNumber",
DROP COLUMN "rejectionReason",
ADD COLUMN     "amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "documentTypeId" TEXT NOT NULL,
ADD COLUMN     "paymentProofFileName" TEXT,
ADD COLUMN     "paymentReferenceDigits" TEXT,
ADD COLUMN     "placeOfBirth" TEXT,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "yearsOfResidency" INTEGER NOT NULL,
ALTER COLUMN "purpose" DROP NOT NULL;

-- DropEnum
DROP TYPE "DocumentRequestStatus";
