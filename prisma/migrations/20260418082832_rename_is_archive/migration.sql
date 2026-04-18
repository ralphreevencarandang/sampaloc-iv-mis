/*
  Warnings:

  - You are about to drop the column `isArchived` on the `Announcement` table. All the data in the column will be lost.
  - You are about to drop the column `isArchived` on the `Official` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Announcement" DROP COLUMN "isArchived",
ADD COLUMN     "isArchive" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Blotter" ADD COLUMN     "isArchive" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Official" DROP COLUMN "isArchived",
ADD COLUMN     "isArchive" BOOLEAN NOT NULL DEFAULT false;
