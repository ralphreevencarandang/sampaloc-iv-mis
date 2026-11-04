ALTER TABLE "Resident" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Admin" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "PasswordResetChallenge" (
  "subject" TEXT PRIMARY KEY,
  "scope" TEXT NOT NULL CHECK ("scope" IN ('resident', 'admin', 'clinic')),
  "accountId" TEXT,
  "credentialHash" TEXT NOT NULL UNIQUE,
  "otpHash" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0 CHECK ("attempts" BETWEEN 0 AND 5),
  "sentAt" TIMESTAMP(3) NOT NULL,
  "resetHash" TEXT UNIQUE,
  "resetExpiresAt" TIMESTAMP(3),
  "sessionVersion" INTEGER,
  CONSTRAINT "password_reset_grant_pair" CHECK (("resetHash" IS NULL) = ("resetExpiresAt" IS NULL))
);
CREATE TABLE "PasswordResetRateLimit" (
  "key" TEXT PRIMARY KEY,
  "count" INTEGER NOT NULL CHECK ("count" > 0),
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "PasswordResetRateLimit_expiresAt_idx" ON "PasswordResetRateLimit"("expiresAt");
