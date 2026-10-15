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
const prisma =
  (cachedPrisma && "document" in cachedPrisma && hasCurrentResidentFields)
    ? cachedPrisma
    : new PrismaClient({
        adapter,
      });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export { prisma };
export default prisma;
