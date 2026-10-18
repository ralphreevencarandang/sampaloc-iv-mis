import "dotenv/config";
import { Prisma, PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg"; 

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set.");
}

const globalForPrisma = global as unknown as {
  prisma: PrismaClient; 
}; 
const adapter = new PrismaPg(process.env.DATABASE_URL);
const cachedPrisma = globalForPrisma.prisma;
const residentFields = Object.keys(Prisma.ResidentScalarFieldEnum);
// Hot reload preserves globals, including clients generated before schema changes.
const hasCurrentResidentFields = cachedPrisma?.resident?.fields
  && Object.keys(cachedPrisma.resident.fields).length === residentFields.length
  && residentFields.every((field) => field in cachedPrisma.resident.fields);
const hasCurrentInventoryFields = cachedPrisma?.inventoryItem?.fields
  && Object.keys(Prisma.InventoryItemScalarFieldEnum).every((field) => field in cachedPrisma.inventoryItem.fields)
  && cachedPrisma?.inventoryTransaction?.fields
  && Object.keys(Prisma.InventoryTransactionScalarFieldEnum).every((field) => field in cachedPrisma.inventoryTransaction.fields);
const hasCurrentDocumentFields = cachedPrisma?.documentRequest?.fields
  && Object.keys(Prisma.DocumentRequestScalarFieldEnum).every((field) => field in cachedPrisma.documentRequest.fields);
const hasCurrentClinicFields = cachedPrisma?.clinicAppointment && cachedPrisma?.clinicSchedule
  && cachedPrisma.clinicAppointment.fields
  && Object.keys(Prisma.ClinicAppointmentScalarFieldEnum).every(field => field in cachedPrisma.clinicAppointment.fields)
  && cachedPrisma?.medicalRecord?.fields
  && Object.keys(Prisma.MedicalRecordScalarFieldEnum).every(field => field in cachedPrisma.medicalRecord.fields);
const prisma =
  (cachedPrisma && "document" in cachedPrisma && hasCurrentResidentFields && hasCurrentInventoryFields && hasCurrentDocumentFields && hasCurrentClinicFields)
    ? cachedPrisma
    : new PrismaClient({
        adapter,
      });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export { prisma };
export default prisma;
