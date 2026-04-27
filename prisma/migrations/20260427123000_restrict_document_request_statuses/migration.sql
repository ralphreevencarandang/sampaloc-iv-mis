-- Create the replacement enum with the restricted status set.
CREATE TYPE "RequestStatus_new" AS ENUM ('PENDING', 'REVIEW', 'APPROVED');

-- Remap existing legacy statuses into the supported set before switching types.
ALTER TABLE "DocumentRequest"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "RequestStatus_new"
USING (
  CASE
    WHEN "status"::text = 'SUBMITTED' THEN 'REVIEW'
    WHEN "status"::text = 'REJECTED' THEN 'REVIEW'
    WHEN "status"::text = 'RELEASED' THEN 'APPROVED'
    ELSE "status"::text
  END
)::"RequestStatus_new";

DROP TYPE "RequestStatus";

ALTER TYPE "RequestStatus_new" RENAME TO "RequestStatus";

ALTER TABLE "DocumentRequest"
ALTER COLUMN "status" SET DEFAULT 'PENDING';
