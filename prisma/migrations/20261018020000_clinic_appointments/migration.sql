CREATE TYPE "VisitType" AS ENUM ('WALK_IN', 'APPOINTMENT');
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW');
CREATE TABLE "ClinicSchedule" (
  "id" TEXT PRIMARY KEY CHECK ("id" = 'clinic'), "operatingDays" INTEGER[] NOT NULL,
  "opensAt" TEXT NOT NULL CHECK ("opensAt" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  "closesAt" TEXT NOT NULL CHECK ("closesAt" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  "slotMinutes" INTEGER NOT NULL CHECK ("slotMinutes" BETWEEN 5 AND 240),
  "capacity" INTEGER NOT NULL CHECK ("capacity" BETWEEN 1 AND 100),
  "enabled" BOOLEAN NOT NULL DEFAULT false, "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CHECK ("opensAt" < "closesAt"), CHECK (cardinality("operatingDays") BETWEEN 1 AND 7 AND "operatingDays" <@ ARRAY[0,1,2,3,4,5,6])
);
CREATE TABLE "ClinicAppointment" (
  "id" TEXT PRIMARY KEY, "residentId" TEXT NOT NULL REFERENCES "Resident"("id") ON DELETE RESTRICT,
  "startsAt" TIMESTAMPTZ(3) NOT NULL, "endsAt" TIMESTAMPTZ(3) NOT NULL,
  "reason" TEXT NOT NULL CHECK (length(trim("reason")) BETWEEN 1 AND 2000), "notes" TEXT,
  "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CHECK ("endsAt" > "startsAt")
);
CREATE INDEX "ClinicAppointment_startsAt_status_idx" ON "ClinicAppointment"("startsAt", "status");
CREATE INDEX "ClinicAppointment_residentId_createdAt_idx" ON "ClinicAppointment"("residentId", "createdAt");
CREATE UNIQUE INDEX "ClinicAppointment_one_active_resident" ON "ClinicAppointment"("residentId") WHERE "status" IN ('PENDING', 'CONFIRMED');
CREATE TABLE "ClinicAppointmentHistory" (
  "id" TEXT PRIMARY KEY, "appointmentId" TEXT NOT NULL REFERENCES "ClinicAppointment"("id") ON DELETE RESTRICT,
  "fromStatus" "AppointmentStatus", "status" "AppointmentStatus" NOT NULL,
  "reason" TEXT, "actorId" TEXT NOT NULL, "actorType" TEXT NOT NULL CHECK ("actorType" IN ('RESIDENT', 'STAFF')),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ("status" NOT IN ('CANCELLED', 'REJECTED') OR length(trim("reason")) > 0 AND "reason" IS NOT NULL)
);
ALTER TABLE "MedicalRecord" ADD COLUMN "visitType" "VisitType" NOT NULL DEFAULT 'WALK_IN', ADD COLUMN "appointmentId" TEXT;
CREATE UNIQUE INDEX "MedicalRecord_appointmentId_key" ON "MedicalRecord"("appointmentId");
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "ClinicAppointment"("id") ON DELETE RESTRICT;
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_visit_link_check" CHECK (("visitType" = 'WALK_IN' AND "appointmentId" IS NULL) OR ("visitType" = 'APPOINTMENT' AND "appointmentId" IS NOT NULL));

CREATE FUNCTION clinic_consultation_identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD."appointmentId" IS DISTINCT FROM NEW."appointmentId" OR OLD."visitType" IS DISTINCT FROM NEW."visitType"
      OR (OLD."appointmentId" IS NOT NULL AND OLD."patientId" IS DISTINCT FROM NEW."patientId")) THEN
    RAISE EXCEPTION 'Consultation visit classification and appointment patient are immutable';
  END IF;
  IF NEW."appointmentId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "ClinicAppointment" a WHERE a."id" = NEW."appointmentId" AND a."residentId" = NEW."patientId" AND a."status" = 'COMPLETED'
  ) THEN
    RAISE EXCEPTION 'Consultation must match the completed appointment patient';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER clinic_consultation_identity BEFORE INSERT OR UPDATE ON "MedicalRecord" FOR EACH ROW EXECUTE FUNCTION clinic_consultation_identity_guard();
