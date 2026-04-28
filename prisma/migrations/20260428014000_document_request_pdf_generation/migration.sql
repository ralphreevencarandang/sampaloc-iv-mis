ALTER TYPE "RequestStatus" ADD VALUE 'GENERATED';

ALTER TABLE "DocumentRequest"
ADD COLUMN "serialNumber" TEXT,
ADD COLUMN "generatedFileUrl" TEXT,
ADD COLUMN "generatedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "DocumentRequest_serialNumber_key" ON "DocumentRequest"("serialNumber");
