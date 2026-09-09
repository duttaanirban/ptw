import {
  AuditAction,
  PermitStatus,
} from "../../generated/prisma/client";

import { prisma } from "../lib/prisma";

export async function expirePermits() {
  const now = new Date();

  const permits = await prisma.permit.findMany({
    where: {
      status: {
        in: [
          PermitStatus.APPROVED,
          PermitStatus.ACTIVE,
        ],
      },
      plannedEnd: {
        lte: now,
      },
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (permits.length === 0) {
    return 0;
  }

  await prisma.$transaction(async (tx) => {
    for (const permit of permits) {
      // Re-check inside the transaction so we don't accidentally
      // expire a permit whose status changed after the initial query.
      const currentPermit = await tx.permit.findUnique({
        where: { id: permit.id },
        select: {
          id: true,
          status: true,
          plannedEnd: true,
        },
      });

      if (!currentPermit) {
        continue;
      }

      if (
        currentPermit.status !== PermitStatus.APPROVED &&
        currentPermit.status !== PermitStatus.ACTIVE
      ) {
        continue;
      }

      if (currentPermit.plannedEnd > now) {
        continue;
      }

      await tx.permit.update({
        where: { id: currentPermit.id },
        data: {
          status: PermitStatus.EXPIRED,
        },
      });

      await tx.permitAuditLog.create({
        data: {
          permitId: currentPermit.id,

          // System-generated action.
          // We use the permit requester as the actor because
          // PermitAuditLog currently requires an actorId.
          actorId: (
            await tx.permit.findUnique({
              where: { id: currentPermit.id },
              select: { requesterId: true },
            })
          )!.requesterId,

          action: AuditAction.EXPIRED,
          fromStatus: currentPermit.status,
          toStatus: PermitStatus.EXPIRED,
          comment: "Permit automatically expired after its validity window ended",
        },
      });
    }
  });

  return permits.length;
}