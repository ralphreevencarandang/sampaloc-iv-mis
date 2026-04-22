import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import bcrypt from "bcryptjs";
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for seeding.");
}

const adapter = new PrismaPg(process.env.DATABASE_URL);
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
            precinctNumber: "1234A",
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
            precinctNumber: "1234B",
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
            precinctNumber: "5678C",
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
            precinctNumber: "9101D",
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
            precinctNumber: "1121E",
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

    console.log("Seeding Admin User...");
    const adminPassword = await bcrypt.hash("adminPassword", 10);
    await prisma.admin.upsert({
        where: { email: "admin@sampalociv.com" },
        update: {},
        create: {
            name: "System Admin",
            email: "admin@sampalociv.com",
            password: adminPassword,
            role: "ADMIN",
        },
    });
    console.log("Seeded admin user successfully.");

    console.log("Seeding Health Worker User...");
    await prisma.admin.upsert({
        where: { email: "healthworker@sampalociv.com" },
        update: {},
        create: {
            name: "Health Worker",
            email: "healthworker@sampalociv.com",
            password: adminPassword,
            role: "HEALTH_WORKER",
        },
    });
    console.log("Seeded health worker user successfully.");

    console.log("Seeding Barangay Officials...");
    const officialsData = [
        {
            email: "armando.movido@sampaloc4.gov.ph",
            firstName: "Armando",
            middleName: "M",
            lastName: "Movido",
            position: "Punong Barangay",
        },
        {
            email: "belen.movido@sampaloc4.gov.ph",
            firstName: "Belen",
            middleName: "P",
            lastName: "Movido",
            position: "Barangay Secretary",
        },
        {
            email: "imelda.villa@sampaloc4.gov.ph",
            firstName: "Imelda",
            middleName: "M",
            lastName: "Villa",
            position: "Barangay Treasurer",
        },
        {
            email: "anabelle.movido@sampaloc4.gov.ph",
            firstName: "Anabelle",
            middleName: "A",
            lastName: "Movido",
            position: "Barangay Kagawad",
        },
        {
            email: "dominador.alvaran@sampaloc4.gov.ph",
            firstName: "Dominador",
            middleName: "P",
            lastName: "Alvaran Jr.",
            position: "Barangay Kagawad",
        },
        {
            email: "reynaldo.ancheta@sampaloc4.gov.ph",
            firstName: "Reynaldo",
            middleName: "B",
            lastName: "Ancheta",
            position: "Barangay Kagawad",
        },
        {
            email: "alicejoy.lopez@sampaloc4.gov.ph",
            firstName: "Alice Joy",
            middleName: "J",
            lastName: "Lopez",
            position: "Barangay Kagawad",
        },
        {
            email: "ernesto.atienza@sampaloc4.gov.ph",
            firstName: "Ernesto",
            middleName: "C",
            lastName: "Atienza",
            position: "Barangay Kagawad",
        },
        {
            email: "jose.devera@sampaloc4.gov.ph",
            firstName: "Jose",
            middleName: "J",
            lastName: "De Vera",
            position: "Barangay Kagawad",
        },
        {
            email: "ruel.ledesma@sampaloc4.gov.ph",
            firstName: "Ruel",
            middleName: "M",
            lastName: "Ledesma",
            position: "Barangay Kagawad",
        },
        {
            email: "jedrick.narvaez@sampaloc4.gov.ph",
            firstName: "Jedrick",
            middleName: "A",
            lastName: "Narvaez",
            position: "SK Chairperson",
        },
    ];

    for (const official of officialsData) {
        await prisma.official.upsert({
            where: { email: official.email },
            update: {},
            create: {
                ...official,
                isActive: true,
                isArchive: false,
                termStart: new Date("2023-11-06"),
                termEnd: new Date("2026-11-05"),
            },
        });
    }
    console.log(`Seeded ${officialsData.length} officials successfully.`);

}
main()
    .catch((e) => {
        console.error("Error generating seed data:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
