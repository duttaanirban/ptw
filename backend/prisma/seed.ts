import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  PermitStatus,
  PermitType,
  ApprovalRole,
  ApprovalStatus,
  AuditAction,
  Prisma,
} from "../generated/prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting database seed...");

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // ==================================================
  // 1. USERS
  // ==================================================

  const admin = await prisma.user.upsert({
    where: { email: "admin@ptw.local" },
    update: {
      name: "System Admin",
      role: "ADMIN",
      passwordHash,
    },
    create: {
      name: "System Admin",
      email: "admin@ptw.local",
      passwordHash,
      role: "ADMIN",
    },
  });

  const requester = await prisma.user.upsert({
    where: { email: "requester@ptw.local" },
    update: {
      name: "Raj Sharma",
      role: "REQUESTER",
      passwordHash,
    },
    create: {
      name: "Raj Sharma",
      email: "requester@ptw.local",
      passwordHash,
      role: "REQUESTER",
    },
  });

  const areaOwner = await prisma.user.upsert({
    where: { email: "owner@ptw.local" },
    update: {
      name: "Amit Verma",
      role: "AREA_OWNER",
      passwordHash,
    },
    create: {
      name: "Amit Verma",
      email: "owner@ptw.local",
      passwordHash,
      role: "AREA_OWNER",
    },
  });

  const safetyOfficer = await prisma.user.upsert({
    where: { email: "safety@ptw.local" },
    update: {
      name: "Priya Singh",
      role: "SAFETY_OFFICER",
      passwordHash,
    },
    create: {
      name: "Priya Singh",
      email: "safety@ptw.local",
      passwordHash,
      role: "SAFETY_OFFICER",
    },
  });

  // ==================================================
  // 2. PLANTS
  // ==================================================

  const plant01 = await prisma.plant.upsert({
    where: { code: "PLANT-01" },
    update: {
      name: "Main Manufacturing Plant",
    },
    create: {
      name: "Main Manufacturing Plant",
      code: "PLANT-01",
    },
  });

  const plant02 = await prisma.plant.upsert({
    where: { code: "PLANT-02" },
    update: {
      name: "Process Utilities Plant",
    },
    create: {
      name: "Process Utilities Plant",
      code: "PLANT-02",
    },
  });

  // ==================================================
  // 3. AREAS
  // ==================================================

  const productionArea = await prisma.area.upsert({
    where: {
      plantId_code: {
        plantId: plant01.id,
        code: "AREA-PROD",
      },
    },
    update: {
      name: "Production Area",
      ownerId: areaOwner.id,
    },
    create: {
      name: "Production Area",
      code: "AREA-PROD",
      plantId: plant01.id,
      ownerId: areaOwner.id,
    },
  });

  const utilityArea = await prisma.area.upsert({
    where: {
      plantId_code: {
        plantId: plant01.id,
        code: "AREA-UTIL",
      },
    },
    update: {
      name: "Utilities Area",
      ownerId: areaOwner.id,
    },
    create: {
      name: "Utilities Area",
      code: "AREA-UTIL",
      plantId: plant01.id,
      ownerId: areaOwner.id,
    },
  });

  const maintenanceArea = await prisma.area.upsert({
    where: {
      plantId_code: {
        plantId: plant02.id,
        code: "AREA-MAINT",
      },
    },
    update: {
      name: "Maintenance Area",
      ownerId: areaOwner.id,
    },
    create: {
      name: "Maintenance Area",
      code: "AREA-MAINT",
      plantId: plant02.id,
      ownerId: areaOwner.id,
    },
  });

  // ==================================================
  // 4. EQUIPMENT
  // ==================================================

  const equipment01 = await prisma.equipment.upsert({
    where: {
      areaId_code: {
        areaId: productionArea.id,
        code: "EQ-WELD-01",
      },
    },
    update: {
      name: "Production Welding Station 01",
    },
    create: {
      name: "Production Welding Station 01",
      code: "EQ-WELD-01",
      areaId: productionArea.id,
    },
  });

  const equipment02 = await prisma.equipment.upsert({
    where: {
      areaId_code: {
        areaId: productionArea.id,
        code: "EQ-PRESS-01",
      },
    },
    update: {
      name: "Hydraulic Press 01",
    },
    create: {
      name: "Hydraulic Press 01",
      code: "EQ-PRESS-01",
      areaId: productionArea.id,
    },
  });

  const equipment03 = await prisma.equipment.upsert({
    where: {
      areaId_code: {
        areaId: utilityArea.id,
        code: "EQ-PUMP-01",
      },
    },
    update: {
      name: "Utility Pump 01",
    },
    create: {
      name: "Utility Pump 01",
      code: "EQ-PUMP-01",
      areaId: utilityArea.id,
    },
  });

  const equipment04 = await prisma.equipment.upsert({
    where: {
      areaId_code: {
        areaId: utilityArea.id,
        code: "EQ-COMP-01",
      },
    },
    update: {
      name: "Air Compressor 01",
    },
    create: {
      name: "Air Compressor 01",
      code: "EQ-COMP-01",
      areaId: utilityArea.id,
    },
  });

  const equipment05 = await prisma.equipment.upsert({
    where: {
      areaId_code: {
        areaId: maintenanceArea.id,
        code: "EQ-MOTOR-01",
      },
    },
    update: {
      name: "Maintenance Motor 01",
    },
    create: {
      name: "Maintenance Motor 01",
      code: "EQ-MOTOR-01",
      areaId: maintenanceArea.id,
    },
  });

  const equipment06 = await prisma.equipment.upsert({
    where: {
      areaId_code: {
        areaId: maintenanceArea.id,
        code: "EQ-PANEL-01",
      },
    },
    update: {
      name: "Electrical Panel 01",
    },
    create: {
      name: "Electrical Panel 01",
      code: "EQ-PANEL-01",
      areaId: maintenanceArea.id,
    },
  });

  // ==================================================
  // 5. REMOVE PREVIOUS SEEDED PERMITS ONLY
  // ==================================================

  const existingSeedPermits = await prisma.permit.findMany({
    where: {
      permitNumber: {
        startsWith: "PTW-SEED-",
      },
    },
    select: {
      id: true,
    },
  });

  if (existingSeedPermits.length > 0) {
    await prisma.permit.deleteMany({
      where: {
        permitNumber: {
          startsWith: "PTW-SEED-",
        },
      },
    });

    console.log(
      `🧹 Removed ${existingSeedPermits.length} previous seeded permits`
    );
  }

  // ==================================================
  // 6. TIME HELPERS
  // ==================================================

  const now = new Date();

  const hoursFromNow = (hours: number) =>
    new Date(now.getTime() + hours * 60 * 60 * 1000);

  const daysFromNow = (days: number) =>
    new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // ==================================================
  // 7. CREATE PERMIT HELPER
  // ==================================================

  async function createSeedPermit(input: {
    permitNumber: string;
    type: PermitType;
    status: PermitStatus;
    requesterId: string;
    plantId: string;
    areaId: string;
    equipmentId?: string;
    contractorTeam: string;
    workDescription: string;
    plannedStart: Date;
    plannedEnd: Date;
    hazards: string[];
    ppe: string[];
    precautions: string[];

    hotWorkDetails?: {
      hotWorkType: string;
      fireWatchAssigned: boolean;
      fireExtinguisherType: string;
      combustiblesClearedRadius?: number;
      lelPercent?: number;
      oxygenPercent?: number;
      gasTestTime?: Date;
    };

    confinedSpaceDetails?: {
      spaceId: string;
      entryPoint: string;
      oxygenPercent?: number;
      lelPercent?: number;
      h2sPpm?: number;
      coPpm?: number;
      atmosphericTestTime?: Date;
      standbyAttendant: string;
      rescuePlan: string;
      ventilationMethod: string;
      entryExitLog: Prisma.InputJsonValue;
    };

    workingAtHeightDetails?: {
      workHeightMeters: number;
      accessMethod: string;
      fallArrestEquipment: string;
      anchorPointVerified: boolean;
      barricadingBelow: boolean;
      weatherConditions?: string;
    };

    electricalLotoDetails?: {
      equipmentTag: string;
      voltageLevel: string;
      isolationPoints: Prisma.InputJsonValue;
      lockNumbers: Prisma.InputJsonValue;
      tagNumbers: Prisma.InputJsonValue;
      earthingApplied: boolean;
      testedDeadBy: string;
      isolationMethod?: string;
      lotoApplied?: boolean;
      verificationMethod?: string;
    };
  }) {
    const permit = await prisma.permit.create({
      data: {
        permitNumber: input.permitNumber,
        type: input.type,
        status: input.status,
        requesterId: input.requesterId,
        plantId: input.plantId,
        areaId: input.areaId,
        equipmentId: input.equipmentId,
        contractorTeam: input.contractorTeam,
        workDescription: input.workDescription,
        plannedStart: input.plannedStart,
        plannedEnd: input.plannedEnd,
        hazards: input.hazards,
        ppe: input.ppe,
        precautions: input.precautions,
      },
    });

    // ------------------------------
    // Type-specific detail
    // ------------------------------

    if (input.hotWorkDetails) {
      await prisma.hotWorkDetails.create({
        data: {
          permitId: permit.id,
          hotWorkType: input.hotWorkDetails.hotWorkType,
          fireWatchAssigned: input.hotWorkDetails.fireWatchAssigned,
          fireExtinguisherType:
            input.hotWorkDetails.fireExtinguisherType,
          combustiblesClearedRadius:
            input.hotWorkDetails.combustiblesClearedRadius,
          lelPercent: input.hotWorkDetails.lelPercent,
          oxygenPercent: input.hotWorkDetails.oxygenPercent,
          gasTestTime: input.hotWorkDetails.gasTestTime,
        },
      });
    }

    if (input.confinedSpaceDetails) {
      await prisma.confinedSpaceDetails.create({
        data: {
          permitId: permit.id,
          spaceId: input.confinedSpaceDetails.spaceId,
          entryPoint: input.confinedSpaceDetails.entryPoint,
          oxygenPercent: input.confinedSpaceDetails.oxygenPercent,
          lelPercent: input.confinedSpaceDetails.lelPercent,
          h2sPpm: input.confinedSpaceDetails.h2sPpm,
          coPpm: input.confinedSpaceDetails.coPpm,
          atmosphericTestTime:
            input.confinedSpaceDetails.atmosphericTestTime,
          standbyAttendant:
            input.confinedSpaceDetails.standbyAttendant,
          rescuePlan: input.confinedSpaceDetails.rescuePlan,
          ventilationMethod:
            input.confinedSpaceDetails.ventilationMethod,
          entryExitLog: input.confinedSpaceDetails.entryExitLog,
        },
      });
    }

    if (input.workingAtHeightDetails) {
      await prisma.workingAtHeightDetails.create({
        data: {
          permitId: permit.id,
          workHeightMeters:
            input.workingAtHeightDetails.workHeightMeters,
          accessMethod: input.workingAtHeightDetails.accessMethod,
          fallArrestEquipment:
            input.workingAtHeightDetails.fallArrestEquipment,
          anchorPointVerified:
            input.workingAtHeightDetails.anchorPointVerified,
          barricadingBelow:
            input.workingAtHeightDetails.barricadingBelow,
          weatherConditions:
            input.workingAtHeightDetails.weatherConditions,
        },
      });
    }

    if (input.electricalLotoDetails) {
      await prisma.electricalLotoDetails.create({
        data: {
          permitId: permit.id,
          equipmentTag: input.electricalLotoDetails.equipmentTag,
          voltageLevel: input.electricalLotoDetails.voltageLevel,
          isolationPoints:
            input.electricalLotoDetails.isolationPoints,
          lockNumbers:
            input.electricalLotoDetails.lockNumbers,
          tagNumbers:
            input.electricalLotoDetails.tagNumbers,
          earthingApplied:
            input.electricalLotoDetails.earthingApplied,
          testedDeadBy:
            input.electricalLotoDetails.testedDeadBy,
          isolationMethod:
            input.electricalLotoDetails.isolationMethod,
          lotoApplied:
            input.electricalLotoDetails.lotoApplied,
          verificationMethod:
            input.electricalLotoDetails.verificationMethod,
        },
      });
    }

    return permit;
  }

  // ==================================================
  // 8. SEED PERMITS
  // ==================================================

  // 01 - DRAFT / HOT WORK
  const permit01 = await createSeedPermit({
    permitNumber: "PTW-SEED-001",
    type: PermitType.HOT_WORK,
    status: PermitStatus.DRAFT,
    requesterId: requester.id,
    plantId: plant01.id,
    areaId: productionArea.id,
    equipmentId: equipment01.id,
    contractorTeam: "Alpha Fabrication Team",
    workDescription: "Repair damaged support bracket near welding station",
    plannedStart: hoursFromNow(24),
    plannedEnd: hoursFromNow(28),
    hazards: ["Fire", "Sparks", "Hot metal"],
    ppe: ["Helmet", "Face shield", "Welding gloves", "Safety shoes"],
    precautions: [
      "Remove combustible materials",
      "Provide fire extinguisher",
      "Assign fire watch",
    ],
    hotWorkDetails: {
      hotWorkType: "WELDING",
      fireWatchAssigned: true,
      fireExtinguisherType: "CO2",
      combustiblesClearedRadius: 10,
      lelPercent: 0,
      oxygenPercent: 20.8,
      gasTestTime: hoursFromNow(23),
    },
  });

  // 02 - PENDING APPROVAL / CONFINED SPACE
  const permit02 = await createSeedPermit({
    permitNumber: "PTW-SEED-002",
    type: PermitType.CONFINED_SPACE,
    status: PermitStatus.PENDING_APPROVAL,
    requesterId: requester.id,
    plantId: plant01.id,
    areaId: utilityArea.id,
    equipmentId: equipment03.id,
    contractorTeam: "Utility Maintenance Team",
    workDescription: "Internal inspection and cleaning of utility sump",
    plannedStart: hoursFromNow(6),
    plannedEnd: hoursFromNow(10),
    hazards: [
      "Low oxygen",
      "Toxic gases",
      "Restricted movement",
    ],
    ppe: [
      "Helmet",
      "Gas detector",
      "Safety harness",
      "Safety shoes",
    ],
    precautions: [
      "Continuous atmospheric monitoring",
      "Standby attendant present",
      "Rescue plan available",
      "Forced ventilation",
    ],
    confinedSpaceDetails: {
      spaceId: "CS-SUMP-01",
      entryPoint: "North access hatch",
      oxygenPercent: 20.8,
      lelPercent: 0,
      h2sPpm: 0,
      coPpm: 2,
      atmosphericTestTime: hoursFromNow(5),
      standbyAttendant: "Suresh Kumar",
      rescuePlan: "Tripod and retrieval line with emergency rescue team",
      ventilationMethod: "Forced air ventilation",
      entryExitLog: [
        {
          action: "ENTRY",
          person: "Raj Sharma",
          time: hoursFromNow(7).toISOString(),
        },
      ],
    },
  });

  // 03 - APPROVED / WORKING AT HEIGHT
  const permit03 = await createSeedPermit({
    permitNumber: "PTW-SEED-003",
    type: PermitType.WORKING_AT_HEIGHT,
    status: PermitStatus.APPROVED,
    requesterId: requester.id,
    plantId: plant01.id,
    areaId: productionArea.id,
    equipmentId: equipment02.id,
    contractorTeam: "Elevate Access Team",
    workDescription: "Replace overhead lighting and inspect cable tray",
    plannedStart: hoursFromNow(2),
    plannedEnd: hoursFromNow(8),
    hazards: ["Fall from height", "Falling objects", "Electrical contact"],
    ppe: [
      "Helmet",
      "Full body harness",
      "Safety shoes",
      "High visibility vest",
    ],
    precautions: [
      "Barricade area below",
      "Inspect access equipment",
      "Verify anchor point",
    ],
    workingAtHeightDetails: {
      workHeightMeters: 7.5,
      accessMethod: "SCAFFOLD",
      fallArrestEquipment: "Full body harness with double lanyard",
      anchorPointVerified: true,
      barricadingBelow: true,
      weatherConditions: "Indoor controlled environment",
    },
  });

  // 04 - ACTIVE / ELECTRICAL LOTO
  const permit04 = await createSeedPermit({
    permitNumber: "PTW-SEED-004",
    type: PermitType.ELECTRICAL_LOTO,
    status: PermitStatus.ACTIVE,
    requesterId: requester.id,
    plantId: plant02.id,
    areaId: maintenanceArea.id,
    equipmentId: equipment06.id,
    contractorTeam: "Electrical Maintenance Team",
    workDescription: "Isolate and repair electrical distribution panel",
    plannedStart: hoursFromNow(-1),
    plannedEnd: hoursFromNow(5),
    hazards: ["Electrical shock", "Arc flash", "Stored energy"],
    ppe: [
      "Arc flash suit",
      "Insulated gloves",
      "Safety helmet",
      "Safety shoes",
    ],
    precautions: [
      "Apply personal locks",
      "Test dead before touching",
      "Apply earthing",
      "Verify zero energy",
    ],
    electricalLotoDetails: {
      equipmentTag: "PANEL-MCC-01",
      voltageLevel: "415V",
      isolationPoints: [
        "Main incomer breaker Q1",
        "Control supply breaker Q5",
      ],
      lockNumbers: ["LOCK-104", "LOCK-105"],
      tagNumbers: ["TAG-204", "TAG-205"],
      earthingApplied: true,
      testedDeadBy: "Priya Singh",
      isolationMethod: "Main breaker isolation",
      lotoApplied: true,
      verificationMethod: "Multimeter zero-voltage verification",
    },
  });

  // 05 - SUSPENDED / HOT WORK
  const permit05 = await createSeedPermit({
    permitNumber: "PTW-SEED-005",
    type: PermitType.HOT_WORK,
    status: PermitStatus.SUSPENDED,
    requesterId: requester.id,
    plantId: plant01.id,
    areaId: productionArea.id,
    equipmentId: equipment01.id,
    contractorTeam: "Alpha Fabrication Team",
    workDescription: "Welding repair on production support frame",
    plannedStart: hoursFromNow(-3),
    plannedEnd: hoursFromNow(4),
    hazards: ["Fire", "Sparks", "Smoke"],
    ppe: ["Helmet", "Welding shield", "Welding gloves", "Safety shoes"],
    precautions: [
      "Fire watch assigned",
      "Remove combustibles",
      "Maintain extinguisher nearby",
    ],
    hotWorkDetails: {
      hotWorkType: "WELDING",
      fireWatchAssigned: true,
      fireExtinguisherType: "Dry Powder",
      combustiblesClearedRadius: 12,
      lelPercent: 0,
      oxygenPercent: 20.9,
      gasTestTime: hoursFromNow(-3),
    },
  });

  // 06 - CLOSED / CONFINED SPACE
  const permit06 = await createSeedPermit({
    permitNumber: "PTW-SEED-006",
    type: PermitType.CONFINED_SPACE,
    status: PermitStatus.CLOSED,
    requesterId: requester.id,
    plantId: plant01.id,
    areaId: utilityArea.id,
    equipmentId: equipment03.id,
    contractorTeam: "Utility Maintenance Team",
    workDescription: "Clean and inspect utility collection sump",
    plannedStart: hoursFromNow(-30),
    plannedEnd: hoursFromNow(-24),
    hazards: ["Restricted entry", "Toxic gases"],
    ppe: ["Helmet", "Gas detector", "Harness", "Safety shoes"],
    precautions: [
      "Gas testing completed",
      "Standby attendant present",
      "Forced ventilation",
    ],
    confinedSpaceDetails: {
      spaceId: "CS-SUMP-02",
      entryPoint: "South hatch",
      oxygenPercent: 20.9,
      lelPercent: 0,
      h2sPpm: 0,
      coPpm: 1,
      atmosphericTestTime: hoursFromNow(-31),
      standbyAttendant: "Suresh Kumar",
      rescuePlan: "Emergency retrieval tripod available",
      ventilationMethod: "Forced air",
      entryExitLog: [
        {
          action: "ENTRY",
          person: "Raj Sharma",
          time: hoursFromNow(-29).toISOString(),
        },
        {
          action: "EXIT",
          person: "Raj Sharma",
          time: hoursFromNow(-25).toISOString(),
        },
      ],
    },
  });

  // 07 - CLOSED VERIFIED / WORKING AT HEIGHT
  const permit07 = await createSeedPermit({
    permitNumber: "PTW-SEED-007",
    type: PermitType.WORKING_AT_HEIGHT,
    status: PermitStatus.CLOSED_VERIFIED,
    requesterId: requester.id,
    plantId: plant02.id,
    areaId: maintenanceArea.id,
    equipmentId: equipment05.id,
    contractorTeam: "Elevate Access Team",
    workDescription: "Inspect elevated motor platform and replace guard rail",
    plannedStart: hoursFromNow(-48),
    plannedEnd: hoursFromNow(-42),
    hazards: ["Fall from height", "Falling tools"],
    ppe: ["Helmet", "Harness", "Safety shoes"],
    precautions: [
      "Anchor point verified",
      "Barricading below",
      "Tool lanyards used",
    ],
    workingAtHeightDetails: {
      workHeightMeters: 6,
      accessMethod: "MEWP",
      fallArrestEquipment: "Full body harness with shock absorber",
      anchorPointVerified: true,
      barricadingBelow: true,
      weatherConditions: "Clear",
    },
  });

  // 08 - REJECTED / ELECTRICAL LOTO
  const permit08 = await createSeedPermit({
    permitNumber: "PTW-SEED-008",
    type: PermitType.ELECTRICAL_LOTO,
    status: PermitStatus.REJECTED,
    requesterId: requester.id,
    plantId: plant02.id,
    areaId: maintenanceArea.id,
    equipmentId: equipment06.id,
    contractorTeam: "Electrical Maintenance Team",
    workDescription: "Replace damaged motor feeder cable",
    plannedStart: daysFromNow(2),
    plannedEnd: daysFromNow(2.2),
    hazards: ["Electrical shock", "Arc flash"],
    ppe: ["Arc flash suit", "Insulated gloves", "Helmet"],
    precautions: [
      "Isolation required",
      "Test dead before work",
    ],
    electricalLotoDetails: {
      equipmentTag: "MCC-02-FEEDER-03",
      voltageLevel: "415V",
      isolationPoints: ["MCC breaker Q8"],
      lockNumbers: ["LOCK-301"],
      tagNumbers: ["TAG-401"],
      earthingApplied: true,
      testedDeadBy: "Priya Singh",
      isolationMethod: "Breaker isolation",
      lotoApplied: true,
      verificationMethod: "Voltage tester",
    },
  });

  // 09 - EXPIRED / HOT WORK
  const permit09 = await createSeedPermit({
    permitNumber: "PTW-SEED-009",
    type: PermitType.HOT_WORK,
    status: PermitStatus.EXPIRED,
    requesterId: requester.id,
    plantId: plant01.id,
    areaId: productionArea.id,
    equipmentId: equipment01.id,
    contractorTeam: "Alpha Fabrication Team",
    workDescription: "Expired welding repair permit",
    plannedStart: hoursFromNow(-20),
    plannedEnd: hoursFromNow(-15),
    hazards: ["Fire", "Sparks"],
    ppe: ["Helmet", "Welding shield", "Welding gloves"],
    precautions: ["Fire watch", "Extinguisher available"],
    hotWorkDetails: {
      hotWorkType: "GRINDING",
      fireWatchAssigned: true,
      fireExtinguisherType: "CO2",
      combustiblesClearedRadius: 10,
      lelPercent: 0,
      oxygenPercent: 20.8,
      gasTestTime: hoursFromNow(-21),
    },
  });

  // 10 - APPROVED / ELECTRICAL LOTO
  const permit10 = await createSeedPermit({
    permitNumber: "PTW-SEED-010",
    type: PermitType.ELECTRICAL_LOTO,
    status: PermitStatus.APPROVED,
    requesterId: requester.id,
    plantId: plant01.id,
    areaId: utilityArea.id,
    equipmentId: equipment04.id,
    contractorTeam: "Electrical Maintenance Team",
    workDescription: "Planned isolation for compressor motor maintenance",
    plannedStart: hoursFromNow(12),
    plannedEnd: hoursFromNow(18),
    hazards: ["Electrical shock", "Stored energy", "Unexpected startup"],
    ppe: [
      "Insulated gloves",
      "Safety helmet",
      "Safety shoes",
    ],
    precautions: [
      "Lockout/tagout",
      "Verify zero energy",
      "Apply earthing",
    ],
    electricalLotoDetails: {
      equipmentTag: "COMP-MOTOR-01",
      voltageLevel: "415V",
      isolationPoints: ["Main motor breaker Q4"],
      lockNumbers: ["LOCK-502"],
      tagNumbers: ["TAG-602"],
      earthingApplied: true,
      testedDeadBy: "Priya Singh",
      isolationMethod: "Main breaker isolation",
      lotoApplied: true,
      verificationMethod: "Multimeter",
    },
  });

  // Avoid unused-variable warnings while keeping permit references
  // available for audit/approval creation below.
  void permit01;
  void permit02;
  void permit03;
  void permit04;
  void permit05;
  void permit06;
  void permit07;
  void permit08;
  void permit09;
  void permit10;

  // ==================================================
  // 9. APPROVAL RECORDS
  // ==================================================

  const seededPermits = await prisma.permit.findMany({
    where: {
      permitNumber: {
        startsWith: "PTW-SEED-",
      },
    },
    select: {
      id: true,
      permitNumber: true,
      status: true,
      areaId: true,
    },
  });

  for (const permit of seededPermits) {
    // DRAFT permits don't have approval records yet.
    if (permit.status === PermitStatus.DRAFT) {
      continue;
    }

    const area = await prisma.area.findUnique({
      where: { id: permit.areaId },
      select: {
        ownerId: true,
      },
    });

    if (!area?.ownerId) {
      continue;
    }

    // Determine approval states based on final seeded status.
    let areaOwnerStatus: ApprovalStatus = ApprovalStatus.APPROVED;
    let safetyStatus: ApprovalStatus = ApprovalStatus.APPROVED;

    if (permit.status === PermitStatus.PENDING_APPROVAL) {
      areaOwnerStatus = ApprovalStatus.PENDING;
      safetyStatus = ApprovalStatus.PENDING;
    }

    if (permit.status === PermitStatus.REJECTED) {
      areaOwnerStatus = ApprovalStatus.REJECTED;
      safetyStatus = ApprovalStatus.APPROVED;
    }

    await prisma.permitApproval.create({
      data: {
        permitId: permit.id,
        approverId: area.ownerId,
        role: ApprovalRole.AREA_OWNER,
        status: areaOwnerStatus,
        comment:
          areaOwnerStatus === ApprovalStatus.REJECTED
            ? "Required electrical isolation details were incomplete."
            : areaOwnerStatus === ApprovalStatus.APPROVED
              ? "Area conditions reviewed and approved."
              : undefined,
        actedAt:
          areaOwnerStatus === ApprovalStatus.PENDING
            ? undefined
            : now,
      },
    });

    await prisma.permitApproval.create({
      data: {
        permitId: permit.id,
        approverId: safetyOfficer.id,
        role: ApprovalRole.SAFETY_OFFICER,
        status: safetyStatus,
        comment:
          safetyStatus === ApprovalStatus.APPROVED
            ? "Safety controls reviewed and approved."
            : undefined,
        actedAt:
          safetyStatus === ApprovalStatus.PENDING
            ? undefined
            : now,
      },
    });
  }

  // ==================================================
  // 10. AUDIT HISTORY
  // ==================================================

  for (const permit of seededPermits) {
    await prisma.permitAuditLog.create({
      data: {
        permitId: permit.id,
        actorId: requester.id,
        action: AuditAction.CREATED,
        fromStatus: undefined,
        toStatus: PermitStatus.DRAFT,
        comment: "Seeded demo permit created",
      },
    });

    // Give every non-draft permit a submission audit.
    if (permit.status !== PermitStatus.DRAFT) {
      await prisma.permitAuditLog.create({
        data: {
          permitId: permit.id,
          actorId: requester.id,
          action: AuditAction.SUBMITTED,
          fromStatus: PermitStatus.DRAFT,
          toStatus: PermitStatus.PENDING_APPROVAL,
          comment: "Seeded demo permit submitted for approval",
        },
      });
    }

    if (
      permit.status === PermitStatus.APPROVED ||
      permit.status === PermitStatus.ACTIVE ||
      permit.status === PermitStatus.SUSPENDED ||
      permit.status === PermitStatus.CLOSED ||
      permit.status === PermitStatus.CLOSED_VERIFIED ||
      permit.status === PermitStatus.EXPIRED
    ) {
      await prisma.permitAuditLog.create({
        data: {
          permitId: permit.id,
          actorId: areaOwner.id,
          action: AuditAction.APPROVED,
          fromStatus: PermitStatus.PENDING_APPROVAL,
          toStatus: PermitStatus.APPROVED,
          comment: "Seeded area owner approval",
        },
      });

      await prisma.permitAuditLog.create({
        data: {
          permitId: permit.id,
          actorId: safetyOfficer.id,
          action: AuditAction.APPROVED,
          fromStatus: PermitStatus.PENDING_APPROVAL,
          toStatus: PermitStatus.APPROVED,
          comment: "Seeded safety officer approval",
        },
      });
    }

    if (
      permit.status === PermitStatus.ACTIVE ||
      permit.status === PermitStatus.SUSPENDED ||
      permit.status === PermitStatus.CLOSED ||
      permit.status === PermitStatus.CLOSED_VERIFIED
    ) {
      await prisma.permitAuditLog.create({
        data: {
          permitId: permit.id,
          actorId: admin.id,
          action: AuditAction.ACTIVATED,
          fromStatus: PermitStatus.APPROVED,
          toStatus: PermitStatus.ACTIVE,
          comment: "Seeded active permit history",
        },
      });
    }

    if (permit.status === PermitStatus.SUSPENDED) {
      await prisma.permitAuditLog.create({
        data: {
          permitId: permit.id,
          actorId: safetyOfficer.id,
          action: AuditAction.SUSPENDED,
          fromStatus: PermitStatus.ACTIVE,
          toStatus: PermitStatus.SUSPENDED,
          comment: "Seeded suspension for demonstration",
        },
      });
    }

    if (
      permit.status === PermitStatus.CLOSED ||
      permit.status === PermitStatus.CLOSED_VERIFIED
    ) {
      await prisma.permitAuditLog.create({
        data: {
          permitId: permit.id,
          actorId: requester.id,
          action: AuditAction.CLOSED,
          fromStatus: PermitStatus.ACTIVE,
          toStatus: PermitStatus.CLOSED,
          comment: "Seeded completion history",
        },
      });
    }

    if (permit.status === PermitStatus.CLOSED_VERIFIED) {
      await prisma.permitAuditLog.create({
        data: {
          permitId: permit.id,
          actorId: safetyOfficer.id,
          action: AuditAction.VERIFIED,
          fromStatus: PermitStatus.CLOSED,
          toStatus: PermitStatus.CLOSED_VERIFIED,
          comment: "Seeded safety verification",
        },
      });
    }

    if (permit.status === PermitStatus.REJECTED) {
      await prisma.permitAuditLog.create({
        data: {
          permitId: permit.id,
          actorId: areaOwner.id,
          action: AuditAction.REJECTED,
          fromStatus: PermitStatus.PENDING_APPROVAL,
          toStatus: PermitStatus.REJECTED,
          comment:
            "Required electrical isolation details were incomplete.",
        },
      });
    }

    if (permit.status === PermitStatus.EXPIRED) {
      await prisma.permitAuditLog.create({
        data: {
          permitId: permit.id,
          actorId: admin.id,
          action: AuditAction.EXPIRED,
          fromStatus: PermitStatus.APPROVED,
          toStatus: PermitStatus.EXPIRED,
          comment: "Seeded expired permit for dashboard demonstration",
        },
      });
    }
  }

  // ==================================================
  // 11. OUTPUT
  // ==================================================

  console.log("");
  console.log("✅ Seed completed successfully!");
  console.log("");

  console.log("Users:");
  console.log("--------------------------------");
  console.log("Admin:          admin@ptw.local");
  console.log("Requester:      requester@ptw.local");
  console.log("Area Owner:     owner@ptw.local");
  console.log("Safety Officer: safety@ptw.local");
  console.log("Password:       Password123!");
  console.log("--------------------------------");

  console.log("");
  console.log("Plants: 2");
  console.log("Equipment: 6");
  console.log("Seeded permits: 10");
  console.log("");

  console.log("Seeded permit statuses:");
  console.log("01  DRAFT");
  console.log("02  PENDING_APPROVAL");
  console.log("03  APPROVED");
  console.log("04  ACTIVE");
  console.log("05  SUSPENDED");
  console.log("06  CLOSED");
  console.log("07  CLOSED_VERIFIED");
  console.log("08  REJECTED");
  console.log("09  EXPIRED");
  console.log("10  APPROVED");
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