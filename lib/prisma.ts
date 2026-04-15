import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client"; 
import { PrismaPg } from "@prisma/adapter-pg"; 

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set.");
}

const globalForPrisma = global as unknown as {
  prisma: PrismaClient; 
}; 
const adapter = new PrismaPg(process.env.DATABASE_URL); 
const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter, 
  }); 
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma; 
export { prisma };
export default prisma; 
