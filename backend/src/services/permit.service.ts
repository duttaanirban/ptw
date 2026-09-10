import {
  AuditAction,
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

export type PermitConflict = {
  permitId: string;
  permitNumber: string;
  type: PermitType;
  status: PermitStatus;
  plantId: string;
  areaId: string;
  equipmentId: string | null;
  plannedStart: Date;
  plannedEnd: Date;
  workDescription: string;
  isHighRisk: boolean;
  reason: string;
};

/**
 * Find permits that overlap the requested time window in the same location.
 *
 * This is intentionally exposed as a reusable service function so the API can
 * warn a requester before creation without making conflict detection a UI-only
 * rule. We do not block creation here: a safety reviewer may still decide that
 * overlapping work is acceptable after assessing the conditions.
 *
 * A Hot Work + Confined Space overlap in the same location is marked as a
 * high-risk conflict because the assignment explicitly calls out this pairing.
 */
export async function findPermitConflicts(input: {
  type: PermitType;
  plantId: string;
  areaId: string;
  equipmentId?: string | null;
  plannedStart: string | Date;
  plannedEnd: string | Date;
  excludePermitId?: string;
}) {
  const plannedStart =
    input.plannedStart instanceof Date
      ? input.plannedStart
      : new Date(input.plannedStart);
  const plannedEnd =
    input.plannedEnd instanceof Date
      ? input.plannedEnd
      : new Date(input.plannedEnd);

  if (Number.isNaN(plannedStart.getTime()) || Number.isNaN(plannedEnd.getTime())) {
    throw new Error("Invalid planned start or end date");
  }

  if (plannedEnd <= plannedStart) {
    throw new Error("Planned end must be after planned start");
  }

  const activeStatuses: PermitStatus[] = [
    PermitStatus.PENDING_APPROVAL,
    PermitStatus.APPROVED,
    PermitStatus.ACTIVE,
    PermitStatus.SUSPENDED,
  ];

  const conflicts = await prisma.permit.findMany({
    where: {
      plantId: input.plantId,
      areaId: input.areaId,
      status: { in: activeStatuses },
      ...(input.excludePermitId
        ? { id: { not: input.excludePermitId } }
        : {}),
      AND: [
        { plannedStart: { lt: plannedEnd } },
        { plannedEnd: { gt: plannedStart } },
        {
          OR: [
            { equipmentId: input.equipmentId ?? null },
            { equipmentId: null },
            ...(input.equipmentId ? [{ equipmentId: input.equipmentId }] : []),
          ],
        },
      ],
    },
    select: {
      id: true,
      permitNumber: true,
      type: true,
      status: true,
      plantId: true,
      areaId: true,
      equipmentId: true,
      plannedStart: true,
      plannedEnd: true,
      workDescription: true,
    },
    orderBy: { plannedStart: "asc" },
  });

  return conflicts.map((conflict) => {
    const isHighRisk =
      (input.type === PermitType.HOT_WORK &&
        conflict.type === PermitType.CONFINED_SPACE) ||
      (input.type === PermitType.CONFINED_SPACE &&
        conflict.type === PermitType.HOT_WORK);

    return {
      ...conflict,
      isHighRisk,
      reason: isHighRisk
        ? "Hot Work overlaps with Confined Space work in the same location and time window."
        : "Another permit overlaps this permit in the same location and time window.",
    };
  });
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

export interface UpdatePermitInput {
  contractorTeam?: string;
  workDescription?: string;
  plantId?: string;
  areaId?: string;
  equipmentId?: string | null;
  plannedStart?: string;
  plannedEnd?: string;
  hazards?: string[];
  ppe?: string[];
  precautions?: string[];
}

export async function updatePermit(
  userId: string,
  permitId: string,
  input: UpdatePermitInput
) {
  const existingPermit = await prisma.permit.findUnique({
    where: { id: permitId },
  });

  if (!existingPermit) {
    throw new Error("Permit not found");
  }

  // Only the requester can edit their own permit.
  if (existingPermit.requesterId !== userId) {
    throw new Error("Only the requester can edit their own permit");
  }

  // Do not allow edits after the permit has reached a terminal state.
  const terminalStatuses: PermitStatus[] = [
    PermitStatus.CLOSED_VERIFIED,
    PermitStatus.EXPIRED,
    PermitStatus.CANCELLED,
    PermitStatus.REJECTED,
  ];

  if (terminalStatuses.includes(existingPermit.status)) {
    throw new Error(
      `Permit cannot be edited in ${existingPermit.status} status`
    );
  }

  // Once work is ACTIVE, changing permit details is unsafe.
  if (existingPermit.status === PermitStatus.ACTIVE) {
    throw new Error("ACTIVE permits cannot be edited");
  }

  const data: Prisma.PermitUpdateInput = {};

  if (input.contractorTeam !== undefined) {
    if (!input.contractorTeam.trim()) {
      throw new Error("Contractor/team cannot be empty");
    }

    data.contractorTeam = input.contractorTeam.trim();
  }

  if (input.workDescription !== undefined) {
    if (!input.workDescription.trim()) {
      throw new Error("Work description cannot be empty");
    }

    data.workDescription = input.workDescription.trim();
  }

  if (input.plantId !== undefined) {
    const plant = await prisma.plant.findUnique({
      where: { id: input.plantId },
    });

    if (!plant) {
      throw new Error("Plant not found");
    }

    data.plant = {
      connect: { id: input.plantId },
    };
  }

  if (input.areaId !== undefined) {
    const area = await prisma.area.findUnique({
      where: { id: input.areaId },
    });

    if (!area) {
      throw new Error("Area not found");
    }

    const targetPlantId = input.plantId ?? existingPermit.plantId;

    if (area.plantId !== targetPlantId) {
      throw new Error("Area does not belong to the selected plant");
    }

    data.area = {
      connect: { id: input.areaId },
    };
  }

  if (input.equipmentId !== undefined) {
    if (input.equipmentId === null) {
      data.equipment = {
        disconnect: true,
      };
    } else {
      const equipment = await prisma.equipment.findUnique({
        where: { id: input.equipmentId },
      });

      if (!equipment) {
        throw new Error("Equipment not found");
      }

      const targetAreaId = input.areaId ?? existingPermit.areaId;

      if (equipment.areaId !== targetAreaId) {
        throw new Error(
          "Equipment does not belong to the selected area"
        );
      }

      data.equipment = {
        connect: { id: input.equipmentId },
      };
    }
  }

  let plannedStart = existingPermit.plannedStart;
  let plannedEnd = existingPermit.plannedEnd;

  if (input.plannedStart !== undefined) {
    const parsedStart = new Date(input.plannedStart);

    if (Number.isNaN(parsedStart.getTime())) {
      throw new Error("Invalid planned start date");
    }

    plannedStart = parsedStart;
    data.plannedStart = parsedStart;
  }

  if (input.plannedEnd !== undefined) {
    const parsedEnd = new Date(input.plannedEnd);

    if (Number.isNaN(parsedEnd.getTime())) {
      throw new Error("Invalid planned end date");
    }

    plannedEnd = parsedEnd;
    data.plannedEnd = parsedEnd;
  }

  if (plannedEnd <= plannedStart) {
    throw new Error(
      "Planned end must be later than planned start"
    );
  }

  if (input.hazards !== undefined) {
    if (!Array.isArray(input.hazards)) {
      throw new Error("Hazards must be an array");
    }

    data.hazards = input.hazards;
  }

  if (input.ppe !== undefined) {
    if (!Array.isArray(input.ppe)) {
      throw new Error("PPE must be an array");
    }

    data.ppe = input.ppe;
  }

  if (input.precautions !== undefined) {
    if (!Array.isArray(input.precautions)) {
      throw new Error("Precautions must be an array");
    }

    data.precautions = input.precautions;
  }

  const newValue: Record<string, unknown> = {};
  const oldValue: Record<string, unknown> = {};

  const compareField = (
    field: string,
    oldVal: unknown,
    newVal: unknown
  ) => {
    if (newVal === undefined) {
      return;
    }

    const normalize = (value: unknown) => {
      if (value instanceof Date) {
        return value.toISOString();
      }

      return value;
    };

    const oldNormalized = normalize(oldVal);
    const newNormalized = normalize(newVal);

    if (JSON.stringify(oldNormalized) !== JSON.stringify(newNormalized)) {
      oldValue[field] = oldNormalized;
      newValue[field] = newNormalized;
    }
  };

  compareField(
    "contractorTeam",
    existingPermit.contractorTeam,
    input.contractorTeam?.trim()
  );

  compareField(
    "workDescription",
    existingPermit.workDescription,
    input.workDescription?.trim()
  );

  compareField(
    "plantId",
    existingPermit.plantId,
    input.plantId
  );

  compareField(
    "areaId",
    existingPermit.areaId,
    input.areaId
  );

  compareField(
    "equipmentId",
    existingPermit.equipmentId,
    input.equipmentId
  );

  compareField(
    "plannedStart",
    existingPermit.plannedStart,
    input.plannedStart !== undefined
      ? new Date(input.plannedStart)
      : undefined
  );

  compareField(
    "plannedEnd",
    existingPermit.plannedEnd,
    input.plannedEnd !== undefined
      ? new Date(input.plannedEnd)
      : undefined
  );

  compareField(
    "hazards",
    existingPermit.hazards,
    input.hazards
  );

  compareField(
    "ppe",
    existingPermit.ppe,
    input.ppe
  );

  compareField(
    "precautions",
    existingPermit.precautions,
    input.precautions
  );

  if (Object.keys(newValue).length === 0) {
    throw new Error("No changes detected");
  }

  return prisma.$transaction(async (tx) => {
    const updatedPermit = await tx.permit.update({
      where: { id: permitId },
      data,
    });

    await tx.permitAuditLog.create({
      data: {
        permitId,
        actorId: userId,
        action: AuditAction.UPDATED,
        oldValue: oldValue as Prisma.InputJsonValue,
        newValue: newValue as Prisma.InputJsonValue,
        comment: "Permit fields updated after submission",
      },
    });

    return updatedPermit;
  });
}

export async function getPermits() {
  return prisma.permit.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      requester: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },

      plant: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },

      area: {
        select: {
          id: true,
          name: true,
          code: true,
          ownerId: true,
        },
      },

      equipment: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },

      approvals: {
        select: {
          id: true,
          approverId: true,
          role: true,
          status: true,
          comment: true,
          actedAt: true,
        },
      },
    },
  });
}

export async function getPermitById(permitId: string) {
  const permit = await prisma.permit.findUnique({
    where: {
      id: permitId,
    },
    include: {
      requester: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      plant: true,
      area: {
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      equipment: true,
      approvals: {
        include: {
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      auditLogs: {
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      hotWorkDetails: true,
      confinedSpaceDetails: true,
      workingAtHeightDetails: true,
      electricalLotoDetails: true,
    },
  });

  if (!permit) {
    throw new Error("Permit not found");
  }

  return permit;
}

export async function getPermitOptions() {
  return prisma.plant.findMany({
    orderBy: {
      name: "asc",
    },
    include: {
      areas: {
        orderBy: {
          name: "asc",
        },
        include: {
          equipment: {
            orderBy: {
              name: "asc",
            },
          },
        },
      },
    },
  });
}