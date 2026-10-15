-- Preserve existing requests, including any historical duplicates.
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

CREATE INDEX "DocumentRequest_residentId_documentTypeId_status_idx"
ON "DocumentRequest"("residentId", "documentTypeId", "status");

-- This document is always free, including existing requests and settings.
UPDATE "Document" SET "price" = 0
WHERE "documentTypeId" IN ('first-time-job-seeker', 'FIRST_TIME_JOB_SEEKER');
UPDATE "DocumentRequest" SET "amount" = 0
WHERE "documentTypeId" IN ('first-time-job-seeker', 'FIRST_TIME_JOB_SEEKER');

ALTER TABLE "Document" ADD CONSTRAINT "Document_job_seeker_free"
CHECK ("documentTypeId" NOT IN ('first-time-job-seeker', 'FIRST_TIME_JOB_SEEKER') OR "price" = 0);
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_job_seeker_free"
CHECK ("documentTypeId" NOT IN ('first-time-job-seeker', 'FIRST_TIME_JOB_SEEKER') OR "amount" = 0);

-- New request copy counts are validated by the server. Historical quantities
-- are retained so existing requests can still be processed without rewriting history.
