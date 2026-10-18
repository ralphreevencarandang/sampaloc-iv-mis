ALTER TABLE "ClinicAppointment"
  ADD COLUMN "consultationStartedAt" TIMESTAMPTZ(3),
  ADD COLUMN "consultationStartedById" TEXT;
ALTER TABLE "ClinicAppointment" ADD CONSTRAINT "ClinicAppointment_start_metadata_check"
  CHECK (("consultationStartedAt" IS NULL) = ("consultationStartedById" IS NULL));

CREATE FUNCTION clinic_appointment_start_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."consultationStartedAt" IS NOT NULL AND (
    OLD."consultationStartedAt" IS DISTINCT FROM NEW."consultationStartedAt" OR
    OLD."consultationStartedById" IS DISTINCT FROM NEW."consultationStartedById"
  ) THEN
    RAISE EXCEPTION 'Actual consultation start metadata is immutable';
  END IF;
  IF OLD."consultationStartedAt" IS NULL AND NEW."consultationStartedAt" IS NOT NULL AND NEW."status" <> 'CONFIRMED' THEN
    RAISE EXCEPTION 'Only confirmed appointments may start a consultation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER clinic_appointment_start BEFORE UPDATE ON "ClinicAppointment"
  FOR EACH ROW EXECUTE FUNCTION clinic_appointment_start_guard();
