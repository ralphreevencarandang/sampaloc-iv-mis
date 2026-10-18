ALTER TABLE "DocumentRequest"
  ADD COLUMN "generatedPdf" BYTEA,
  ADD COLUMN "pdfGenerationToken" TEXT,
  ADD COLUMN "pdfGenerationExpiresAt" TIMESTAMP(3);

ALTER TABLE "DocumentRequest"
  ADD CONSTRAINT "DocumentRequest_pdf_lease_pair" CHECK (("pdfGenerationToken" IS NULL) = ("pdfGenerationExpiresAt" IS NULL)),
  ADD CONSTRAINT "DocumentRequest_pdf_metadata" CHECK ("generatedPdf" IS NULL OR ("serialNumber" IS NOT NULL AND "generatedAt" IS NOT NULL));

CREATE FUNCTION preserve_document_pdf_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."serialNumber" IS NOT NULL AND NEW."serialNumber" IS DISTINCT FROM OLD."serialNumber" THEN
    RAISE EXCEPTION 'An assigned document serial number cannot be changed' USING ERRCODE = '23514';
  END IF;
  IF OLD."generatedPdf" IS NOT NULL AND NEW."generatedPdf" IS DISTINCT FROM OLD."generatedPdf" THEN
    RAISE EXCEPTION 'A stored document PDF cannot be replaced' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "DocumentRequest_preserve_pdf_identity"
BEFORE UPDATE ON "DocumentRequest"
FOR EACH ROW EXECUTE FUNCTION preserve_document_pdf_identity();
