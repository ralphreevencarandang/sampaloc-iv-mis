-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Official" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;
