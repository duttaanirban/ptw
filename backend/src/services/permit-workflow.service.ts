import {
  ApprovalRole,
  ApprovalStatus,
  AuditAction,
  PermitStatus,
  UserRole,
} from "../../generated/prisma/client";

import { prisma } from "../lib/prisma";

type WorkflowAction =
  | "SUBMIT"
  | "APPROVE"
  | "REJECT"
  | "ACTIVATE"
  | "SUSPEND"
  | "RESUME"
  | "CLOSE"
  | "VERIFY_CLOSE"
  | "CANCEL";

type WorkflowUser = {
  userId: string;
  role: UserRole;
};

function workflowError(message: string): Error {
  return new Error(message);
}

/**
 * Submit a DRAFT permit.
 *
 * DRAFT -> PENDING_APPROVAL
 *
 * On submission we create the two required approval records:
 * 1. AREA_OWNER
 * 2. SAFETY_OFFICER
 */
export async function submitPermit(
  permitId: string,
  actor: WorkflowUser
) {
  if (
    actor.role !== UserRole.REQUESTER &&
    actor.role !== UserRole.ADMIN
  ) {
    throw workflowError(
      "Only the requester or an admin can submit a permit"
    );
  }

  const permit = await prisma.permit.findUnique({
    where: { id: permitId },
    include: {
      area: {
        include: {
          owner: true,
        },
      },
      requester: true,
    },
  });

  if (!permit) {
    throw workflowError("Permit not found");
  }

  if (permit.requesterId !== actor.userId && actor.role !== UserRole.ADMIN) {
    throw workflowError(
      "Only the permit requester can submit this permit"
    );
  }

  if (permit.status !== PermitStatus.DRAFT) {
    throw workflowError(
      `Cannot submit a permit in ${permit.status} status`
    );
  }

  if (!permit.area.ownerId) {
    throw workflowError(
      "The selected area does not have an assigned area owner"
    );
  }

  if (permit.area.ownerId === permit.requesterId) {
    throw workflowError(
      "Requester cannot be the area owner/approver for the same permit"
    );
  }

  const safetyOfficer = await prisma.user.findFirst({
    where: {
      role: UserRole.SAFETY_OFFICER,
      id: {
        not: permit.requesterId,
      },
    },
  });

  if (!safetyOfficer) {
    throw workflowError(
      "No eligible safety officer is available"
    );
  }

  return prisma.$transaction(async (tx) => {
    const updatedPermit = await tx.permit.update({
      where: { id: permitId },
      data: {
        status: PermitStatus.PENDING_APPROVAL,
      },
    });

    await tx.permitApproval.createMany({
      data: [
        {
          permitId,
          approverId: permit.area.ownerId!,
          role: ApprovalRole.AREA_OWNER,
          status: ApprovalStatus.PENDING,
        },
        {
          permitId,
          approverId: safetyOfficer.id,
          role: ApprovalRole.SAFETY_OFFICER,
          status: ApprovalStatus.PENDING,
        },
      ],
    });

    await tx.permitAuditLog.create({
      data: {
        permitId,
        actorId: actor.userId,
        action: AuditAction.SUBMITTED,
        fromStatus: PermitStatus.DRAFT,
        toStatus: PermitStatus.PENDING_APPROVAL,
      },
    });

    return updatedPermit;
  });
}

/**
 * Approve a permit.
 *
 * Area Owner and Safety Officer each approve their own approval record.
 *
 * PENDING_APPROVAL
 *      ↓
 * PENDING_APPROVAL
 *      ↓
 * both approvals approved
 *      ↓
 * APPROVED
 */
export async function approvePermit(
  permitId: string,
  actor: WorkflowUser,
  comment?: string
) {
  if (
    actor.role !== UserRole.AREA_OWNER &&
    actor.role !== UserRole.SAFETY_OFFICER &&
    actor.role !== UserRole.ADMIN
  ) {
    throw workflowError(
      "Only an area owner or safety officer can approve a permit"
    );
  }

  const permit = await prisma.permit.findUnique({
    where: { id: permitId },
    include: {
      requester: true,
      approvals: true,
      area: true,
    },
  });

  if (!permit) {
    throw workflowError("Permit not found");
  }

  if (permit.status !== PermitStatus.PENDING_APPROVAL) {
    throw workflowError(
      `Cannot approve a permit in ${permit.status} status`
    );
  }

  if (permit.requesterId === actor.userId) {
    throw workflowError(
      "Requester cannot approve their own permit"
    );
  }

  let approvalRole: ApprovalRole;

  if (actor.role === UserRole.AREA_OWNER) {
    if (permit.area.ownerId !== actor.userId && actor.role !== UserRole.ADMIN) {
      throw workflowError(
        "You are not the owner of this permit's area"
      );
    }

    approvalRole = ApprovalRole.AREA_OWNER;
  } else {
    approvalRole = ApprovalRole.SAFETY_OFFICER;
  }

  const approval = permit.approvals.find(
    (item) => item.role === approvalRole
  );

  if (!approval) {
    throw workflowError(
      `${approvalRole} approval record does not exist`
    );
  }

  if (approval.approverId !== actor.userId && actor.role !== UserRole.ADMIN) {
    throw workflowError(
      "You are not assigned to approve this permit"
    );
  }

  if (approval.status !== ApprovalStatus.PENDING) {
    throw workflowError(
      `This approval has already been ${approval.status.toLowerCase()}`
    );
  }

  return prisma.$transaction(async (tx) => {
    await tx.permitApproval.update({
      where: { id: approval.id },
      data: {
        status: ApprovalStatus.APPROVED,
        comment,
        actedAt: new Date(),
      },
    });

    const allApprovals = await tx.permitApproval.findMany({
      where: { permitId },
    });

    const allApproved = allApprovals.every(
      (item) => item.status === ApprovalStatus.APPROVED
    );

    const newStatus = allApproved
      ? PermitStatus.APPROVED
      : PermitStatus.PENDING_APPROVAL;

    await tx.permit.update({
      where: { id: permitId },
      data: {
        status: newStatus,
      },
    });

    await tx.permitAuditLog.create({
      data: {
        permitId,
        actorId: actor.userId,
        action: AuditAction.APPROVED,
        fromStatus: PermitStatus.PENDING_APPROVAL,
        toStatus: newStatus,
        comment,
      },
    });

    return {
      status: newStatus,
      allApproved,
    };
  });
}

/**
 * Reject a permit.
 *
 * PENDING_APPROVAL -> REJECTED
 */
export async function rejectPermit(
  permitId: string,
  actor: WorkflowUser,
  comment?: string
) {
  if (
    actor.role !== UserRole.AREA_OWNER &&
    actor.role !== UserRole.SAFETY_OFFICER &&
    actor.role !== UserRole.ADMIN
  ) {
    throw workflowError(
      "Only an area owner or safety officer can reject a permit"
    );
  }

  const permit = await prisma.permit.findUnique({
    where: { id: permitId },
    include: {
      approvals: true,
      area: true,
    },
  });

  if (!permit) {
    throw workflowError("Permit not found");
  }

  if (permit.status !== PermitStatus.PENDING_APPROVAL) {
    throw workflowError(
      `Cannot reject a permit in ${permit.status} status`
    );
  }

  if (permit.requesterId === actor.userId) {
    throw workflowError(
      "Requester cannot reject their own permit"
    );
  }

  let approvalRole: ApprovalRole;

  if (actor.role === UserRole.AREA_OWNER) {
    if (permit.area.ownerId !== actor.userId) {
      throw workflowError(
        "You are not the owner of this permit's area"
      );
    }

    approvalRole = ApprovalRole.AREA_OWNER;
  } else {
    approvalRole = ApprovalRole.SAFETY_OFFICER;
  }

  const approval = permit.approvals.find(
    (item) => item.role === approvalRole
  );

  if (!approval) {
    throw workflowError(
      `${approvalRole} approval record does not exist`
    );
  }

  if (approval.approverId !== actor.userId) {
    throw workflowError(
      "You are not assigned to reject this permit"
    );
  }

  return prisma.$transaction(async (tx) => {
    await tx.permitApproval.update({
      where: { id: approval.id },
      data: {
        status: ApprovalStatus.REJECTED,
        comment,
        actedAt: new Date(),
      },
    });

    await tx.permit.update({
      where: { id: permitId },
      data: {
        status: PermitStatus.REJECTED,
      },
    });

    await tx.permitAuditLog.create({
      data: {
        permitId,
        actorId: actor.userId,
        action: AuditAction.REJECTED,
        fromStatus: PermitStatus.PENDING_APPROVAL,
        toStatus: PermitStatus.REJECTED,
        comment,
      },
    });

    return {
      status: PermitStatus.REJECTED,
    };
  });
}