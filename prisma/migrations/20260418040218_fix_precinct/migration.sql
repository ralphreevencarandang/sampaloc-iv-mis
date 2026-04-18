/*
  Warnings:

  - You are about to drop the column `precintNumber` on the `Resident` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Resident" DROP COLUMN "precintNumber",
ADD COLUMN     "precinctNumber" TEXT;
