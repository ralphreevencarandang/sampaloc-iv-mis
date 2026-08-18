ALTER TABLE "InventoryItem"
ADD COLUMN "storageLocation" TEXT NOT NULL DEFAULT 'Main Office - Room 1',
ADD COLUMN "description" TEXT,
ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "InventoryItem"
ALTER COLUMN "storageLocation" DROP DEFAULT;

ALTER TABLE "InventoryItem"
ADD CONSTRAINT "InventoryItem_quantity_nonnegative" CHECK ("quantity" >= 0);
