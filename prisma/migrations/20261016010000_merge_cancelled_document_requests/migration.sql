-- Keep the preceding migration intact for databases that already applied it.
-- Preserve every request and its issuance timestamps while merging outcomes.
BEGIN;
CREATE TYPE "RequestStatus_merged" AS ENUM ('PENDING', 'REVIEW', 'APPROVED', 'GENERATED', 'REJECTED');
ALTER TABLE "DocumentRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "DocumentRequest" ALTER COLUMN "status" TYPE "RequestStatus_merged"
USING (CASE WHEN "status"::text = 'CANCELLED' THEN 'REJECTED' ELSE "status"::text END)::"RequestStatus_merged";
DROP TYPE "RequestStatus";
ALTER TYPE "RequestStatus_merged" RENAME TO "RequestStatus";
ALTER TABLE "DocumentRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;
