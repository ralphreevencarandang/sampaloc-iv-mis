/*
  Warnings:

  - You are about to drop the column `officialImage` on the `Official` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Official" DROP COLUMN "officialImage",
ADD COLUMN     "officialProfile" TEXT;
