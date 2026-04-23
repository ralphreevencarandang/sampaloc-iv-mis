-- CreateEnum
CREATE TYPE "DocumentRequestStatus" AS ENUM ('PENDING_PAYMENT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "DocumentRequest" ADD COLUMN     "details" JSONB,
ADD COLUMN     "documentStatus" "DocumentRequestStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
ADD COLUMN     "proofOfPayment" TEXT,
ADD COLUMN     "referenceNumber" TEXT,
ADD COLUMN     "rejectionReason" TEXT;
