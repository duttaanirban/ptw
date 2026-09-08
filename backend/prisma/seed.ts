import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting database seed...");

  // --------------------------------------------------
  // 1. USERS
  // --------------------------------------------------

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@ptw.local" },
    update: {},
    create: {
      name: "System Admin",
      email: "admin@ptw.local",
      passwordHash,
      role: "ADMIN",
    },
  });

  const requester = await prisma.user.upsert({
    where: { email: "requester@ptw.local" },
    update: {},
    create: {
      name: "Raj Sharma",
      email: "requester@ptw.local",
      passwordHash,
      role: "REQUESTER",
    },
  });

  const areaOwner = await prisma.user.upsert({
    where: { email: "owner@ptw.local" },
    update: {},
    create: {
      name: "Amit Verma",
      email: "owner@ptw.local",
      passwordHash,
      role: "AREA_OWNER",
    },
  });

  const safetyOfficer = await prisma.user.upsert({
    where: { email: "safety@ptw.local" },
    update: {},
    create: {
      name: "Priya Singh",
      email: "safety@ptw.local",
      passwordHash,
      role: "SAFETY_OFFICER",
    },
  });

  // --------------------------------------------------
  // 2. PLANT
  // --------------------------------------------------

  const plant = await prisma.plant.upsert({
    where: { code: "PLANT-01" },
    update: {},
    create: {
      name: "Main Manufacturing Plant",
      code: "PLANT-01",
    },
  });

  // --------------------------------------------------
  // 3. AREAS
  // --------------------------------------------------

  const productionArea = await prisma.area.upsert({
    where: {
      plantId_code: {
        plantId: plant.id,
        code: "AREA-PROD",
      },
    },
    update: {},
    create: {
      name: "Production Area",
      code: "AREA-PROD",
      plantId: plant.id,
      ownerId: areaOwner.id,
    },
  });

  const utilityArea = await prisma.area.upsert({
    where: {
      plantId_code: {
        plantId: plant.id,
        code: "AREA-UTIL",
      },
    },
    update: {},
    create: {
      name: "Utilities Area",
      code: "AREA-UTIL",
      plantId: plant.id,
      ownerId: areaOwner.id,
    },
  });

  // --------------------------------------------------
  // 4. EQUIPMENT
  // --------------------------------------------------

  await prisma.equipment.upsert({
    where: {
      areaId_code: {
        areaId: productionArea.id,
        code: "EQ-WELD-01",
      },
    },
    update: {},
    create: {
      name: "Production Welding Station 01",
      code: "EQ-WELD-01",
      areaId: productionArea.id,
    },
  });

  await prisma.equipment.upsert({
    where: {
      areaId_code: {
        areaId: productionArea.id,
        code: "EQ-PRESS-01",
      },
    },
    update: {},
    create: {
      name: "Hydraulic Press 01",
      code: "EQ-PRESS-01",
      areaId: productionArea.id,
    },
  });

  await prisma.equipment.upsert({
    where: {
      areaId_code: {
        areaId: utilityArea.id,
        code: "EQ-PUMP-01",
      },
    },
    update: {},
    create: {
      name: "Utility Pump 01",
      code: "EQ-PUMP-01",
      areaId: utilityArea.id,
    },
  });

  // --------------------------------------------------
  // 5. OUTPUT
  // --------------------------------------------------

  console.log("✅ Seed completed!");
  console.log("");
  console.log("Demo users:");
  console.log("--------------------------------");
  console.log("Admin:          admin@ptw.local");
  console.log("Requester:      requester@ptw.local");
  console.log("Area Owner:     owner@ptw.local");
  console.log("Safety Officer: safety@ptw.local");
  console.log("");
  console.log("Password for all users: Password123!");
  console.log("--------------------------------");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });