ALTER TABLE "Resident" RENAME COLUMN "address" TO "street";

ALTER TABLE "Resident"
ADD COLUMN "houseNumber" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Resident"
ALTER COLUMN "houseNumber" DROP DEFAULT;
