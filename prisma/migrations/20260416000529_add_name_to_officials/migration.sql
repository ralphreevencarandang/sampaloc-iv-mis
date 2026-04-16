/*
  Warnings:

  - The values [OFFICIAL] on the enum `AdminRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `adminId` on the `Official` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `Official` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `Official` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `Official` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `Official` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AdminRole_new" AS ENUM ('HEALTH_WORKER');
ALTER TABLE "Admin" ALTER COLUMN "role" TYPE "AdminRole_new" USING ("role"::text::"AdminRole_new");
ALTER TYPE "AdminRole" RENAME TO "AdminRole_old";
ALTER TYPE "AdminRole_new" RENAME TO "AdminRole";
DROP TYPE "public"."AdminRole_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Official" DROP CONSTRAINT "Official_adminId_fkey";

-- DropIndex
DROP INDEX "Official_adminId_key";

-- AlterTable
ALTER TABLE "Official" DROP COLUMN "adminId",
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "middleName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Official_email_key" ON "Official"("email");
