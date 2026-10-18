ALTER TABLE "InventoryItem"
  ADD COLUMN "isMedicine" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "expiresOn" DATE,
  ADD COLUMN "stockVersion" INTEGER NOT NULL DEFAULT 0;

-- NOT VALID preserves legacy data; new writes still enforce nonnegative stock.
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_nonnegative_quantity"
  CHECK ("quantity" >= 0) NOT VALID;

ALTER TABLE "InventoryTransaction"
  ADD COLUMN "medicalRecordId" TEXT,
  ADD COLUMN "dispensedById" TEXT,
  ADD COLUMN "dispenseKey" TEXT,
  ADD COLUMN "itemName" TEXT,
  ADD COLUMN "itemUnit" TEXT;

ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_medicalRecordId_fkey"
  FOREIGN KEY ("medicalRecordId") REFERENCES "MedicalRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_dispensedById_fkey"
  FOREIGN KEY ("dispensedById") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_dispensing_complete"
  CHECK ("dispenseKey" IS NULL OR (
    "medicalRecordId" IS NOT NULL AND "dispensedById" IS NOT NULL
    AND "distributedToId" IS NOT NULL AND "itemName" IS NOT NULL AND "itemUnit" IS NOT NULL
    AND "type" = 'OUT' AND "quantity" > 0
  ));
CREATE UNIQUE INDEX "InventoryTransaction_dispenseKey_itemId_key" ON "InventoryTransaction"("dispenseKey", "itemId");
CREATE INDEX "InventoryTransaction_medicalRecordId_date_idx" ON "InventoryTransaction"("medicalRecordId", "date");
