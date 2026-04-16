import { PrismaClient, Prisma } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import bcrypt from "bcryptjs";
// Note: we assume the user provided valid adapter initialization below.
// If not, @prisma/adapter-pg typically expects a pg.Pool instance instead of an object.
const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
} as any);
const prisma = new PrismaClient({
    adapter,
});
async function main() {
    console.log("Seeding Sample Residents...");
    // Requirement: password is "password" (hash it before saving using bcrypt)
    const hashedPassword = await bcrypt.hash("password", 10);
    const residentsData = [
        {
            email: "juan.delacruz@example.com",
            firstName: "Juan",
            lastName: "Dela Cruz",
            middleName: "Santos",
            birthDate: new Date("1985-06-15"),
            gender: "Male",
            civilStatus: "Married",
            street: "Mabini St",
            houseNumber: "123",
            contactNumber: "09171234567",
            occupation: "Engineer",
            citizenship: "Filipino",
            isVoter: true,
            status: "APPROVED" as const,
        },
        {
            email: "maria.clara@example.com",
            firstName: "Maria",
            lastName: "Santiago",
            middleName: "Clara",
            birthDate: new Date("1990-11-20"),
            gender: "Female",
            civilStatus: "Single",
            street: "Rizal St",
            houseNumber: "45-A",
            contactNumber: "09181234567",
            occupation: "Teacher",
            citizenship: "Filipino",
            isVoter: true,
            status: "APPROVED" as const,
        },
        {
            email: "pedro.penduko@example.com",
            firstName: "Pedro",
            lastName: "Penduko",
            middleName: "Reyes",
            birthDate: new Date("1995-03-10"),
            gender: "Male",
            civilStatus: "Single",
            street: "Bonifacio St",
            houseNumber: "89",
            contactNumber: "09191234567",
            occupation: "Student",
            citizenship: "Filipino",
            isVoter: false,
            status: "PENDING" as const,
        },
        {
            email: "jose.rizal@example.com",
            firstName: "Jose",
            lastName: "Rizal",
            middleName: "Mercado",
            birthDate: new Date("1970-12-30"),
            gender: "Male",
            civilStatus: "Widowed",
            street: "Luna St",
            houseNumber: "1A",
            contactNumber: "09201234567",
            occupation: "Doctor",
            citizenship: "Filipino",
            isVoter: true,
            status: "APPROVED" as const,
        },
        {
            email: "gabriela.silang@example.com",
            firstName: "Gabriela",
            lastName: "Silang",
            middleName: "Cruz",
            birthDate: new Date("1988-08-08"),
            gender: "Female",
            civilStatus: "Married",
            street: "Aquino St",
            houseNumber: "55",
            contactNumber: "09211234567",
            occupation: "Business Owner",
            citizenship: "Filipino",
            isVoter: true,
            status: "APPROVED" as const,
        },
        {
            email: "lapula.pu@example.com",
            firstName: "Lapu",
            lastName: "Lapu",
            middleName: "Mactan",
            birthDate: new Date("1992-04-27"),
            gender: "Male",
            civilStatus: "Single",
            street: "Magsaysay St",
            houseNumber: "100",
            contactNumber: "09221234567",
            occupation: "Security Guard",
            citizenship: "Filipino",
            isVoter: true,
            status: "PENDING" as const,
        }
    ];
    for (const resident of residentsData) {
        // Idempotent implementation using upsert
        await prisma.resident.upsert({
            where: { email: resident.email },
            update: {},
            create: {
                ...resident,
                password: hashedPassword,
            },
        });
    }
    console.log(`Seeded ${residentsData.length} residents successfully.`);
}
main()
    .catch((e) => {
        console.error("Error generating seed data:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
