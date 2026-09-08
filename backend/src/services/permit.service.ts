import { PermitStatus, PermitType } from "../../generated/prisma/client";
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
  hazards: unknown;
  ppe: unknown;
  precautions: unknown;

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
    standbyAttendant: string;
    rescuePlan: string;
    ventilationMethod: string;
  };

  workingAtHeightDetails?: {
    workHeightMeters: number;
    accessMethod: string;
    fallProtectionSystem: string;
    anchorPointVerified: boolean;
    scaffoldInspected: boolean;
    weatherConditions?: string;
  };

  electricalLotoDetails?: {
    isolationPoint: string;
    isolationMethod: string;
    lotoApplied: boolean;
    zeroEnergyVerified: boolean;
    authorizedPerson: string;
    voltageLevel?: string;
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

  // Verify plant exists
  const plant = await prisma.plant.findUnique({
    where: { id: input.plantId },
  });

  if (!plant) {
    throw new Error("Plant not found");
  }

  // Verify area belongs to plant
  const area = await prisma.area.findFirst({
    where: {
      id: input.areaId,
      plantId: input.plantId,
    },
  });

  if (!area) {
    throw new Error("Area does not belong to the selected plant");
  }

  // Verify equipment belongs to area
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

  // Validate type-specific details
  if (input.type === PermitType.HOT_WORK && !input.hotWorkDetails) {
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

        hazards: input.hazards ?? [],
        ppe: input.ppe ?? [],
        precautions: input.precautions ?? [],

        hotWorkDetails:
          input.type === PermitType.HOT_WORK && input.hotWorkDetails
            ? {
                create: {
                  hotWorkType: input.hotWorkDetails.hotWorkType,
                  fireWatchAssigned:
                    input.hotWorkDetails.fireWatchAssigned,
                  fireExtinguisherType:
                    input.hotWorkDetails.fireExtinguisherType,
                  combustiblesClearedRadius:
                    input.hotWorkDetails.combustiblesClearedRadius,
                  lelPercent: input.hotWorkDetails.lelPercent,
                  oxygenPercent: input.hotWorkDetails.oxygenPercent,
                  gasTestTime: input.hotWorkDetails.gasTestTime
                    ? new Date(input.hotWorkDetails.gasTestTime)
                    : undefined,
                },
              }
            : undefined,

        confinedSpaceDetails:
          input.type === PermitType.CONFINED_SPACE &&
          input.confinedSpaceDetails
            ? {
                create: {
                  spaceId: input.confinedSpaceDetails.spaceId,
                  entryPoint: input.confinedSpaceDetails.entryPoint,
                  oxygenPercent:
                    input.confinedSpaceDetails.oxygenPercent,
                  lelPercent: input.confinedSpaceDetails.lelPercent,
                  h2sPpm: input.confinedSpaceDetails.h2sPpm,
                  coPpm: input.confinedSpaceDetails.coPpm,
                  standbyAttendant:
                    input.confinedSpaceDetails.standbyAttendant,
                  rescuePlan: input.confinedSpaceDetails.rescuePlan,
                  ventilationMethod:
                    input.confinedSpaceDetails.ventilationMethod,
                },
              }
            : undefined,

        workingAtHeightDetails:
          input.type === PermitType.WORKING_AT_HEIGHT &&
          input.workingAtHeightDetails
            ? {
                create: {
                  workHeightMeters:
                    input.workingAtHeightDetails.workHeightMeters,
                  accessMethod:
                    input.workingAtHeightDetails.accessMethod,
                  fallProtectionSystem:
                    input.workingAtHeightDetails.fallProtectionSystem,
                  anchorPointVerified:
                    input.workingAtHeightDetails.anchorPointVerified,
                  scaffoldInspected:
                    input.workingAtHeightDetails.scaffoldInspected,
                  weatherConditions:
                    input.workingAtHeightDetails.weatherConditions,
                },
              }
            : undefined,

        electricalLotoDetails:
          input.type === PermitType.ELECTRICAL_LOTO &&
          input.electricalLotoDetails
            ? {
                create: {
                  isolationPoint:
                    input.electricalLotoDetails.isolationPoint,
                  isolationMethod:
                    input.electricalLotoDetails.isolationMethod,
                  lotoApplied:
                    input.electricalLotoDetails.lotoApplied,
                  zeroEnergyVerified:
                    input.electricalLotoDetails.zeroEnergyVerified,
                  authorizedPerson:
                    input.electricalLotoDetails.authorizedPerson,
                  voltageLevel:
                    input.electricalLotoDetails.voltageLevel,
                  verificationMethod:
                    input.electricalLotoDetails.verificationMethod,
                },
              }
            : undefined,
      },
    });

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