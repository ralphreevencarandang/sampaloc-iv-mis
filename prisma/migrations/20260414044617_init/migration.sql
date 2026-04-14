-- CreateEnum
CREATE TYPE "Role" AS ENUM ('RESIDENT', 'OFFICIAL', 'HEALTH_WORKER');

-- CreateEnum
CREATE TYPE "BlotterStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'RELEASED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'RESIDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resident" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "civilStatus" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "contactNumber" TEXT,
    "occupation" TEXT,
    "citizenship" TEXT NOT NULL,
    "isVoter" BOOLEAN NOT NULL DEFAULT false,
    "is4PsBeneficiary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Official" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "termStart" TIMESTAMP(3) NOT NULL,
    "termEnd" TIMESTAMP(3),

    CONSTRAINT "Official_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "breed" TEXT,
    "color" TEXT,
    "vaccinationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blotter" (
    "id" TEXT NOT NULL,
    "complainantId" TEXT NOT NULL,
    "respondentName" TEXT NOT NULL,
    "incident" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "BlotterStatus" NOT NULL DEFAULT 'OPEN',
    "handledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blotter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "distributedToId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRequest" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalRecord" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "symptoms" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "treatment" TEXT NOT NULL,
    "prescription" TEXT,
    "checkedById" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Resident_userId_key" ON "Resident"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Official_userId_key" ON "Official"("userId");

-- AddForeignKey
ALTER TABLE "Resident" ADD CONSTRAINT "Resident_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Official" ADD CONSTRAINT "Official_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Official"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blotter" ADD CONSTRAINT "Blotter_complainantId_fkey" FOREIGN KEY ("complainantId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blotter" ADD CONSTRAINT "Blotter_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "Official"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_distributedToId_fkey" FOREIGN KEY ("distributedToId") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "Official"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
