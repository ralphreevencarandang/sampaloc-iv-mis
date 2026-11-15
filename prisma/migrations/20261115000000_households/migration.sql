CREATE TABLE "Household" (
  "id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Household_number_key" ON "Household"("number");
CREATE TABLE "HouseholdMember" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "residentId" TEXT,
  "firstName" TEXT NOT NULL,
  "middleName" TEXT,
  "lastName" TEXT NOT NULL,
  "suffix" TEXT,
  "birthDate" TIMESTAMP(3),
  "sex" TEXT,
  "relationship" TEXT NOT NULL,
  "otherRelationship" TEXT,
  "contactNumber" TEXT,
  "isHead" BOOLEAN NOT NULL DEFAULT false,
  "removedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HouseholdMember_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HouseholdMember_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HouseholdMember_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "HouseholdMember_householdId_removedAt_idx" ON "HouseholdMember"("householdId", "removedAt");
CREATE INDEX "HouseholdMember_firstName_lastName_idx" ON "HouseholdMember"("firstName", "lastName");
CREATE UNIQUE INDEX "HouseholdMember_one_active_membership_per_resident" ON "HouseholdMember"("residentId") WHERE "residentId" IS NOT NULL AND "removedAt" IS NULL;
CREATE UNIQUE INDEX "HouseholdMember_one_active_head_per_household" ON "HouseholdMember"("householdId") WHERE "isHead" = true AND "removedAt" IS NULL;
