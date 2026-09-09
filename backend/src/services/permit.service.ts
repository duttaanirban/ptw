import {
  PermitStatus,
  PermitType,
  Prisma,
} from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";

type CreatePermitInput = {
  type: PermitType;

  plantId: string;
  areaId: string;
  equipmentId?: string;

  contractorTeam: string;
  workDescription: string;

  plannedStart: string;
  plannedEnd: string;

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
    gasTestTime?: string;
  };

  confinedSpaceDetails?: {
    spaceId: string;
    entryPoint: string;
    oxygenPercent?: number;
    lelPercent?: number;
    h2sPpm?: number;
    coPpm?: number;
    atmosphericTestTime?: string;
    standbyAttendant: string;
    rescuePlan: string;
    ventilationMethod: string;
    entryExitLog?: Prisma.InputJsonValue;
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
    isolationPoints?: Prisma.InputJsonValue;
    lockNumbers?: Prisma.InputJsonValue;
    tagNumbers?: Prisma.InputJsonValue;
    earthingApplied: boolean;
    testedDeadBy: string;

    // Additional useful fields
    isolationMethod?: string;
    lotoApplied?: boolean;
    verificationMethod?: string;
  };
};

function generatePermitNumber(): string {
  const timestamp = Date.now().toString().slice(-8);
  return `PTW-${timestamp}`;
}

export async function createPermit(
  requesterId: string,
  input: CreatePermitInput
) {
  // --------------------------------------------------
  // COMMON VALIDATION
  // --------------------------------------------------

  if (!input.type) {
    throw new Error("Permit type is required");
  }

  if (!input.plantId || !input.areaId) {
    throw new Error("Plant and area are required");
  }

  if (!input.contractorTeam?.trim()) {
    throw new Error("Contractor/team is required");
  }

  if (!input.workDescription?.trim()) {
    throw new Error("Work description is required");
  }

  if (!input.plannedStart || !input.plannedEnd) {
    throw new Error("Planned start and end are required");
  }

  const plannedStart = new Date(input.plannedStart);
  const plannedEnd = new Date(input.plannedEnd);

  if (
    Number.isNaN(plannedStart.getTime()) ||
    Number.isNaN(plannedEnd.getTime())
  ) {
    throw new Error("Invalid planned start or end date");
  }

  if (plannedEnd <= plannedStart) {
    throw new Error("Planned end must be after planned start");
  }

  // --------------------------------------------------
  // VERIFY REQUESTER
  // --------------------------------------------------

  const requester = await prisma.user.findUnique({
    where: {
      id: requesterId,
    },
  });

  if (!requester) {
    throw new Error("Requester not found");
  }

  // --------------------------------------------------
  // VERIFY PLANT
  // --------------------------------------------------

  const plant = await prisma.plant.findUnique({
    where: {
      id: input.plantId,
    },
  });

  if (!plant) {
    throw new Error("Plant not found");
  }

  // --------------------------------------------------
  // VERIFY AREA BELONGS TO PLANT
  // --------------------------------------------------

  const area = await prisma.area.findFirst({
    where: {
      id: input.areaId,
      plantId: input.plantId,
    },
  });

  if (!area) {
    throw new Error("Area does not belong to the selected plant");
  }

  // --------------------------------------------------
  // VERIFY EQUIPMENT BELONGS TO AREA
  // --------------------------------------------------

  if (input.equipmentId) {
    const equipment = await prisma.equipment.findFirst({
      where: {
        id: input.equipmentId,
        areaId: input.areaId,
      },
    });

    if (!equipment) {
      throw new Error("Equipment does not belong to the selected area");
    }
  }

  // --------------------------------------------------
  // VALIDATE HAZARDS / PPE / PRECAUTIONS
  // --------------------------------------------------

  if (!Array.isArray(input.hazards)) {
    throw new Error("Hazards must be an array");
  }

  if (!Array.isArray(input.ppe)) {
    throw new Error("PPE must be an array");
  }

  if (!Array.isArray(input.precautions)) {
    throw new Error("Precautions must be an array");
  }

  // --------------------------------------------------
  // TYPE-SPECIFIC VALIDATION
  // --------------------------------------------------

  if (
    input.type === PermitType.HOT_WORK &&
    !input.hotWorkDetails
  ) {
    throw new Error("Hot Work details are required");
  }

  if (
    input.type === PermitType.CONFINED_SPACE &&
    !input.confinedSpaceDetails
  ) {
    throw new Error("Confined Space details are required");
  }

  if (
    input.type === PermitType.WORKING_AT_HEIGHT &&
    !input.workingAtHeightDetails
  ) {
    throw new Error("Working at Height details are required");
  }

  if (
    input.type === PermitType.ELECTRICAL_LOTO &&
    !input.electricalLotoDetails
  ) {
    throw new Error("Electrical/LOTO details are required");
  }

  // --------------------------------------------------
  // HOT WORK VALIDATION
  // --------------------------------------------------

  if (input.hotWorkDetails) {
    const details = input.hotWorkDetails;

    if (!details.hotWorkType?.trim()) {
      throw new Error("Hot work type is required");
    }

    if (!details.fireExtinguisherType?.trim()) {
      throw new Error("Fire extinguisher type is required");
    }

    if (details.combustiblesClearedRadius !== undefined) {
      if (details.combustiblesClearedRadius < 0) {
        throw new Error(
          "Combustibles cleared radius cannot be negative"
        );
      }
    }

    if (details.lelPercent !== undefined) {
      if (details.lelPercent < 0) {
        throw new Error("LEL percentage cannot be negative");
      }
    }

    if (details.oxygenPercent !== undefined) {
      if (details.oxygenPercent < 0) {
        throw new Error("Oxygen percentage cannot be negative");
      }
    }

    if (details.gasTestTime) {
      const gasTestTime = new Date(details.gasTestTime);

      if (Number.isNaN(gasTestTime.getTime())) {
        throw new Error("Invalid gas test time");
      }
    }
  }

  // --------------------------------------------------
  // CONFINED SPACE VALIDATION
  // --------------------------------------------------

  if (input.confinedSpaceDetails) {
    const details = input.confinedSpaceDetails;

    if (!details.spaceId?.trim()) {
      throw new Error("Space ID is required");
    }

    if (!details.entryPoint?.trim()) {
      throw new Error("Entry point is required");
    }

    if (!details.standbyAttendant?.trim()) {
      throw new Error("Standby attendant is required");
    }

    if (!details.rescuePlan?.trim()) {
      throw new Error("Rescue plan is required");
    }

    if (!details.ventilationMethod?.trim()) {
      throw new Error("Ventilation method is required");
    }

    if (
      details.atmosphericTestTime !== undefined
    ) {
      const atmosphericTestTime = new Date(
        details.atmosphericTestTime
      );

      if (Number.isNaN(atmosphericTestTime.getTime())) {
        throw new Error("Invalid atmospheric test time");
      }
    }

    if (details.oxygenPercent !== undefined && details.oxygenPercent < 0) {
      throw new Error("Oxygen percentage cannot be negative");
    }

    if (details.lelPercent !== undefined && details.lelPercent < 0) {
      throw new Error("LEL percentage cannot be negative");
    }

    if (details.h2sPpm !== undefined && details.h2sPpm < 0) {
      throw new Error("H₂S ppm cannot be negative");
    }

    if (details.coPpm !== undefined && details.coPpm < 0) {
      throw new Error("CO ppm cannot be negative");
    }

    if (
      details.entryExitLog !== undefined &&
      !Array.isArray(details.entryExitLog)
    ) {
      throw new Error("Entry/exit log must be an array");
    }
  }

  // --------------------------------------------------
  // WORKING AT HEIGHT VALIDATION
  // --------------------------------------------------

  if (input.workingAtHeightDetails) {
    const details = input.workingAtHeightDetails;

    if (details.workHeightMeters <= 0) {
      throw new Error("Work height must be greater than zero");
    }

    if (!details.accessMethod?.trim()) {
      throw new Error("Access method is required");
    }

    if (!details.fallArrestEquipment?.trim()) {
      throw new Error("Fall arrest equipment is required");
    }
  }

  // --------------------------------------------------
  // ELECTRICAL / LOTO VALIDATION
  // --------------------------------------------------

  if (input.electricalLotoDetails) {
    const details = input.electricalLotoDetails;

    if (!details.equipmentTag?.trim()) {
      throw new Error("Equipment tag is required");
    }

    if (!details.voltageLevel?.trim()) {
      throw new Error("Voltage level is required");
    }

    if (!details.testedDeadBy?.trim()) {
      throw new Error("Tested-dead person is required");
    }

    if (!Array.isArray(details.isolationPoints)) {
      throw new Error("Isolation points must be an array");
    }

    if (!Array.isArray(details.lockNumbers)) {
      throw new Error("Lock numbers must be an array");
    }

    if (!Array.isArray(details.tagNumbers)) {
      throw new Error("Tag numbers must be an array");
    }
  }

  // --------------------------------------------------
  // CREATE PERMIT
  // --------------------------------------------------

  const permitNumber = generatePermitNumber();

  const permit = await prisma.$transaction(async (tx) => {
    const created = await tx.permit.create({
      data: {
        permitNumber,

        type: input.type,
        status: PermitStatus.DRAFT,

        requesterId,

        plantId: input.plantId,
        areaId: input.areaId,
        equipmentId: input.equipmentId,

        contractorTeam: input.contractorTeam.trim(),
        workDescription: input.workDescription.trim(),

        plannedStart,
        plannedEnd,

        hazards: input.hazards,
        ppe: input.ppe,
        precautions: input.precautions,

        // --------------------------------------------------
        // HOT WORK DETAILS
        // --------------------------------------------------

        hotWorkDetails:
          input.type === PermitType.HOT_WORK &&
          input.hotWorkDetails
            ? {
                create: {
                  hotWorkType:
                    input.hotWorkDetails.hotWorkType.trim(),

                  fireWatchAssigned:
                    input.hotWorkDetails.fireWatchAssigned,

                  fireExtinguisherType:
                    input.hotWorkDetails.fireExtinguisherType.trim(),

                  ...(input.hotWorkDetails
                    .combustiblesClearedRadius !== undefined && {
                    combustiblesClearedRadius:
                      input.hotWorkDetails
                        .combustiblesClearedRadius,
                  }),

                  ...(input.hotWorkDetails.lelPercent !== undefined && {
                    lelPercent:
                      input.hotWorkDetails.lelPercent,
                  }),

                  ...(input.hotWorkDetails.oxygenPercent !== undefined && {
                    oxygenPercent:
                      input.hotWorkDetails.oxygenPercent,
                  }),

                  ...(input.hotWorkDetails.gasTestTime !== undefined && {
                    gasTestTime: new Date(
                      input.hotWorkDetails.gasTestTime
                    ),
                  }),
                },
              }
            : undefined,

        // --------------------------------------------------
        // CONFINED SPACE DETAILS
        // --------------------------------------------------

        confinedSpaceDetails:
          input.type === PermitType.CONFINED_SPACE &&
          input.confinedSpaceDetails
            ? {
                create: {
                  spaceId:
                    input.confinedSpaceDetails.spaceId.trim(),

                  entryPoint:
                    input.confinedSpaceDetails.entryPoint.trim(),

                  ...(input.confinedSpaceDetails
                    .oxygenPercent !== undefined && {
                    oxygenPercent:
                      input.confinedSpaceDetails.oxygenPercent,
                  }),

                  ...(input.confinedSpaceDetails
                    .lelPercent !== undefined && {
                    lelPercent:
                      input.confinedSpaceDetails.lelPercent,
                  }),

                  ...(input.confinedSpaceDetails
                    .h2sPpm !== undefined && {
                    h2sPpm:
                      input.confinedSpaceDetails.h2sPpm,
                  }),

                  ...(input.confinedSpaceDetails
                    .coPpm !== undefined && {
                    coPpm:
                      input.confinedSpaceDetails.coPpm,
                  }),

                  ...(input.confinedSpaceDetails
                    .atmosphericTestTime !== undefined && {
                    atmosphericTestTime: new Date(
                      input.confinedSpaceDetails
                        .atmosphericTestTime
                    ),
                  }),

                  standbyAttendant:
                    input.confinedSpaceDetails.standbyAttendant.trim(),

                  rescuePlan:
                    input.confinedSpaceDetails.rescuePlan.trim(),

                  ventilationMethod:
                    input.confinedSpaceDetails.ventilationMethod.trim(),

                  entryExitLog:
                    input.confinedSpaceDetails.entryExitLog ?? [],
                },
              }
            : undefined,

        // --------------------------------------------------
        // WORKING AT HEIGHT DETAILS
        // --------------------------------------------------

        workingAtHeightDetails:
          input.type === PermitType.WORKING_AT_HEIGHT &&
          input.workingAtHeightDetails
            ? {
                create: {
                  workHeightMeters:
                    input.workingAtHeightDetails.workHeightMeters,

                  accessMethod:
                    input.workingAtHeightDetails.accessMethod.trim(),

                  fallArrestEquipment:
                    input.workingAtHeightDetails
                      .fallArrestEquipment.trim(),

                  anchorPointVerified:
                    input.workingAtHeightDetails
                      .anchorPointVerified,

                  barricadingBelow:
                    input.workingAtHeightDetails
                      .barricadingBelow,

                  ...(input.workingAtHeightDetails
                    .weatherConditions !== undefined && {
                    weatherConditions:
                      input.workingAtHeightDetails
                        .weatherConditions.trim(),
                  }),
                },
              }
            : undefined,

        // --------------------------------------------------
        // ELECTRICAL / LOTO DETAILS
        // --------------------------------------------------

        electricalLotoDetails:
          input.type === PermitType.ELECTRICAL_LOTO &&
          input.electricalLotoDetails
            ? {
                create: {
                  equipmentTag:
                    input.electricalLotoDetails.equipmentTag.trim(),

                  voltageLevel:
                    input.electricalLotoDetails.voltageLevel.trim(),

                  isolationPoints:
                    input.electricalLotoDetails
                      .isolationPoints ?? [],

                  lockNumbers:
                    input.electricalLotoDetails
                      .lockNumbers ?? [],

                  tagNumbers:
                    input.electricalLotoDetails
                      .tagNumbers ?? [],

                  earthingApplied:
                    input.electricalLotoDetails
                      .earthingApplied,

                  testedDeadBy:
                    input.electricalLotoDetails
                      .testedDeadBy.trim(),

                  ...(input.electricalLotoDetails
                    .isolationMethod !== undefined && {
                    isolationMethod:
                      input.electricalLotoDetails
                        .isolationMethod.trim(),
                  }),

                  ...(input.electricalLotoDetails
                    .lotoApplied !== undefined && {
                    lotoApplied:
                      input.electricalLotoDetails
                        .lotoApplied,
                  }),

                  ...(input.electricalLotoDetails
                    .verificationMethod !== undefined && {
                    verificationMethod:
                      input.electricalLotoDetails
                        .verificationMethod.trim(),
                  }),
                },
              }
            : undefined,
      },
    });

    // --------------------------------------------------
    // CREATION AUDIT LOG
    // --------------------------------------------------

    await tx.permitAuditLog.create({
      data: {
        permitId: created.id,
        actorId: requesterId,

        action: "CREATED",

        fromStatus: null,
        toStatus: PermitStatus.DRAFT,
      },
    });

    return created;
  });

  return permit;
}