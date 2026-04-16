/*
  Warnings:

  - You are about to drop the column `image` on the `Official` table. All the data in the column will be lost.
  - Made the column `middleName` on table `Official` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Official" DROP COLUMN "image",
ADD COLUMN     "officialImage" TEXT,
ALTER COLUMN "middleName" SET NOT NULL;
