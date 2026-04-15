-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OFFICIAL', 'HEALTH_WORKER');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- Preserve official and health worker credentials from User
INSERT INTO "Admin" ("id", "name", "email", "password", "role", "createdAt")
SELECT
    "id",
    "name",
    "email",
    "password",
    CASE
        WHEN "role" = 'OFFICIAL' THEN 'OFFICIAL'::"AdminRole"
        ELSE 'HEALTH_WORKER'::"AdminRole"
    END,
    "createdAt"
FROM "User"
WHERE "role" IN ('OFFICIAL', 'HEALTH_WORKER');

-- Add new auth columns before dropping the old relation
ALTER TABLE "Official" ADD COLUMN "adminId" TEXT;

ALTER TABLE "Resident"
ADD COLUMN "email" TEXT,
ADD COLUMN "password" TEXT,
ADD COLUMN "verifyOtp" TEXT,
ADD COLUMN "verifyOtpExpireAt" TIMESTAMP(3),
ADD COLUMN "resetOtp" TEXT,
ADD COLUMN "resetOtpExpireAt" TIMESTAMP(3);

-- Move existing credentials from User to Resident
UPDATE "Resident" AS r
SET
    "email" = u."email",
    "password" = u."password"
FROM "User" AS u
WHERE r."userId" = u."id";

-- Repoint official auth records to Admin
UPDATE "Official"
SET "adminId" = "userId";

-- Drop old foreign keys
ALTER TABLE "MedicalRecord" DROP CONSTRAINT "MedicalRecord_checkedById_fkey";
ALTER TABLE "Official" DROP CONSTRAINT "Official_userId_fkey";
ALTER TABLE "Resident" DROP CONSTRAINT "Resident_userId_fkey";

-- Enforce new required fields
ALTER TABLE "Official" ALTER COLUMN "adminId" SET NOT NULL;
ALTER TABLE "Resident" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "Resident" ALTER COLUMN "password" SET NOT NULL;

-- Drop obsolete unique indexes
DROP INDEX "Official_userId_key";
DROP INDEX "Resident_userId_key";
DROP INDEX "User_email_key";

-- Create new unique indexes
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");
CREATE UNIQUE INDEX "Official_adminId_key" ON "Official"("adminId");
CREATE UNIQUE INDEX "Resident_email_key" ON "Resident"("email");

-- Add new foreign keys
ALTER TABLE "Official" ADD CONSTRAINT "Official_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Remove old relation columns and table
ALTER TABLE "Official" DROP COLUMN "userId";
ALTER TABLE "Resident" DROP COLUMN "userId";

DROP TABLE "User";

-- Replace enum used only by the removed table
DROP TYPE "Role";
