-- Existing residents retain NULL details; new registrations require them in validation.
ALTER TABLE "Resident"
ADD COLUMN "idType" TEXT,
ADD COLUMN "idNumber" TEXT,
ADD COLUMN "otherIdType" TEXT;
