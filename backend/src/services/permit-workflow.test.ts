import {
  afterAll,
  describe,
  expect,
  it,
} from "vitest";

import {
  PermitStatus,
  UserRole,
} from "../../generated/prisma/client";

import { prisma } from "../lib/prisma";

import {
  activatePermit,
  approvePermit,
  closePermit,
  rejectPermit,
  verifyClosedPermit,
} from "./permit-workflow.service";

import { updatePermit } from "./permit.service";

async function getPermit(permitNumber: string) {
  const permit = await prisma.permit.findUnique({
    where: { permitNumber },
  });

  if (!permit) {
    throw new Error(`Seed permit ${permitNumber} not found`);
  }

  return permit;
}

async function getUser(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error(`Seed user ${email} not found`);
  }

  return user;
}

/**
 * Make the test fixture deterministic.
 *
 * The application has automatic expiry handling, so hard-coded historical
 * dates can make otherwise valid workflow tests fail on later runs.
 */
async function preparePermit(
  permitNumber: string,
  status: PermitStatus,
  startOffsetMinutes = 60,
  endOffsetMinutes = 120
) {
  const now = new Date();

  const plannedStart = new Date(
    now.getTime() + startOffsetMinutes * 60 * 1000
  );

  const plannedEnd = new Date(
    now.getTime() + endOffsetMinutes * 60 * 1000
  );

  return prisma.permit.update({
    where: {
      permitNumber,
    },
    data: {
      status,
      plannedStart,
      plannedEnd,
    },
  });
}

describe("PTW workflow rules", () => {
  it("prevents a requester from approving a permit", async () => {
    const permit = await getPermit("PTW-SEED-002");
    const requester = await getUser("requester@ptw.local");

    await expect(
      approvePermit(permit.id, {
        userId: requester.id,
        role: UserRole.REQUESTER,
      })
    ).rejects.toThrow(
      "Only an area owner or safety officer can approve a permit"
    );
  });

  it("requires a rejection reason", async () => {
    const permit = await getPermit("PTW-SEED-002");
    const areaOwner = await getUser("owner@ptw.local");

    await expect(
      rejectPermit(permit.id, {
        userId: areaOwner.id,
        role: UserRole.AREA_OWNER,
      })
    ).rejects.toThrow("A rejection reason is required");
  });

  it("prevents activation before the planned start time", async () => {
    await preparePermit(
      "PTW-SEED-003",
      PermitStatus.APPROVED,
      60,
      120
    );

    const permit = await getPermit("PTW-SEED-003");
    const areaOwner = await getUser("owner@ptw.local");

    expect(permit.status).toBe(PermitStatus.APPROVED);

    await expect(
      activatePermit(permit.id, {
        userId: areaOwner.id,
        role: UserRole.AREA_OWNER,
      })
    ).rejects.toThrow(
      "Permit cannot be activated before its planned start time"
    );
  });

  it("requires completion notes when closing a permit", async () => {
    await preparePermit(
      "PTW-SEED-004",
      PermitStatus.ACTIVE,
      -30,
      120
    );

    const permit = await getPermit("PTW-SEED-004");
    const requester = await getUser("requester@ptw.local");

    expect(permit.status).toBe(PermitStatus.ACTIVE);

    await expect(
      closePermit(requester.id, permit.id, "")
    ).rejects.toThrow("Completion notes are required");
  });

  it("does not allow a non-requester to close someone else's permit", async () => {
    await preparePermit(
      "PTW-SEED-004",
      PermitStatus.ACTIVE,
      -30,
      120
    );

    const permit = await getPermit("PTW-SEED-004");
    const areaOwner = await getUser("owner@ptw.local");

    await expect(
      closePermit(areaOwner.id, permit.id, "Work completed")
    ).rejects.toThrow(
      "Only the requester can close their own permit"
    );
  });

  it("prevents non-safety users from verifying closure", async () => {
    await preparePermit(
      "PTW-SEED-006",
      PermitStatus.CLOSED,
      -30,
      120
    );

    const permit = await getPermit("PTW-SEED-006");
    const requester = await getUser("requester@ptw.local");

    expect(permit.status).toBe(PermitStatus.CLOSED);

    await expect(
      verifyClosedPermit(requester.id, permit.id)
    ).rejects.toThrow(
      "Only the Safety Officer or Admin can verify permit closure"
    );
  });

  it("prevents edits while a permit is ACTIVE", async () => {
    await preparePermit(
      "PTW-SEED-004",
      PermitStatus.ACTIVE,
      -30,
      120
    );

    const permit = await getPermit("PTW-SEED-004");
    const requester = await getUser("requester@ptw.local");

    await expect(
      updatePermit(requester.id, permit.id, {
        workDescription: "Attempted change during active work",
      })
    ).rejects.toThrow("ACTIVE permits cannot be edited");
  });

  it("records an audit entry for a post-submission field edit", async () => {
    await preparePermit(
      "PTW-SEED-002",
      PermitStatus.PENDING_APPROVAL,
      60,
      120
    );

    const permit = await getPermit("PTW-SEED-002");
    const requester = await getUser("requester@ptw.local");

    const originalDescription = permit.workDescription;
    const updatedDescription =
      "Updated confined space inspection description";

    const updatedPermit = await updatePermit(
      requester.id,
      permit.id,
      {
        workDescription: updatedDescription,
      }
    );

    expect(updatedPermit.workDescription).toBe(
      updatedDescription
    );

    const audit = await prisma.permitAuditLog.findFirst({
      where: {
        permitId: permit.id,
        actorId: requester.id,
        action: "UPDATED",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    expect(audit).not.toBeNull();

    expect(audit?.oldValue).toMatchObject({
      workDescription: originalDescription,
    });

    expect(audit?.newValue).toMatchObject({
      workDescription: updatedDescription,
    });

    // Restore the seeded record without generating another audit entry.
    await prisma.permit.update({
      where: {
        id: permit.id,
      },
      data: {
        workDescription: originalDescription,
      },
    });
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});