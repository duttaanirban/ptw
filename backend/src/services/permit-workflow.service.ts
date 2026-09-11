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
  comment?: string,
  signature?: string
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

  // Every approval must include a captured digital signature.
  // Keep this validation in the service as well as the controller so the
  // business rule is enforced even if the service is called directly.
  if (!signature?.trim()) {
    throw workflowError("Digital signature is required for approval");
  }

  const normalizedSignature = signature.trim();

  if (!normalizedSignature.startsWith("data:image/png;base64,")) {
    throw workflowError("Invalid digital signature format");
  }

  if (normalizedSignature.length > 250_000) {
    throw workflowError("Digital signature is too large");
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
        newValue: {
          approvalRole,
          signature: normalizedSignature,
          signedAt: new Date().toISOString(),
        },
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

  // Rejection reason is mandatory.
  if (!comment?.trim()) {
    throw workflowError(
      "A rejection reason is required"
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

  if (approval.status !== ApprovalStatus.PENDING) {
    throw workflowError(
      `This approval has already been ${approval.status.toLowerCase()}`
    );
  }

  const rejectionReason = comment.trim();

  return prisma.$transaction(async (tx) => {
    await tx.permitApproval.update({
      where: { id: approval.id },
      data: {
        status: ApprovalStatus.REJECTED,
        comment: rejectionReason,
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
        comment: rejectionReason,
      },
    });

    return {
      status: PermitStatus.REJECTED,
      rejectionReason,
    };
  });
}

export async function activatePermit(
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
      "Only an area owner, safety officer, or admin can activate a permit"
    );
  }

  const permit = await prisma.permit.findUnique({
    where: { id: permitId },
    include: {
      approvals: true,
    },
  });

  if (!permit) {
    throw workflowError("Permit not found");
  }

  if (permit.status !== PermitStatus.APPROVED) {
    throw workflowError(
      `Cannot activate a permit in ${permit.status} status`
    );
  }

  const now = new Date();

    if (now < permit.plannedStart) {
    throw workflowError(
        "Permit cannot be activated before its planned start time"
    );
    }

    if (now >= permit.plannedEnd) {
    throw workflowError(
        "Permit has passed its validity window and cannot be activated"
    );
    }

  const allApproved = permit.approvals.every(
    (approval) => approval.status === ApprovalStatus.APPROVED
  );

  if (!allApproved) {
    throw workflowError(
      "All required approvals must be completed before activation"
    );
  }

  return prisma.$transaction(async (tx) => {
    const updatedPermit = await tx.permit.update({
      where: { id: permitId },
      data: {
        status: PermitStatus.ACTIVE,
      },
    });

    await tx.permitAuditLog.create({
      data: {
        permitId,
        actorId: actor.userId,
        action: AuditAction.ACTIVATED,
        fromStatus: PermitStatus.APPROVED,
        toStatus: PermitStatus.ACTIVE,
        comment,
      },
    });

    return updatedPermit;
  });
}

export async function suspendPermit(
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
      "Only an area owner, safety officer, or admin can suspend a permit"
    );
  }

  if (!comment?.trim()) {
    throw workflowError(
      "A reason is required when suspending a permit"
    );
  }

  const permit = await prisma.permit.findUnique({
    where: { id: permitId },
  });

  if (!permit) {
    throw workflowError("Permit not found");
  }

  if (permit.status !== PermitStatus.ACTIVE) {
    throw workflowError(
      `Cannot suspend a permit in ${permit.status} status`
    );
  }

  return prisma.$transaction(async (tx) => {
    const updatedPermit = await tx.permit.update({
      where: { id: permitId },
      data: {
        status: PermitStatus.SUSPENDED,
      },
    });

    await tx.permitAuditLog.create({
      data: {
        permitId,
        actorId: actor.userId,
        action: AuditAction.SUSPENDED,
        fromStatus: PermitStatus.ACTIVE,
        toStatus: PermitStatus.SUSPENDED,
        comment,
      },
    });

    return updatedPermit;
  });
}

export async function resumePermit(
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
      "Only an area owner, safety officer, or admin can resume a permit"
    );
  }

  const permit = await prisma.permit.findUnique({
    where: { id: permitId },
  });

  if (!permit) {
    throw workflowError("Permit not found");
  }

  if (permit.status !== PermitStatus.SUSPENDED) {
    throw workflowError(
      `Cannot resume a permit in ${permit.status} status`
    );
  }

  return prisma.$transaction(async (tx) => {
    const updatedPermit = await tx.permit.update({
      where: { id: permitId },
      data: {
        status: PermitStatus.ACTIVE,
      },
    });

    await tx.permitAuditLog.create({
      data: {
        permitId,
        actorId: actor.userId,
        action: AuditAction.RESUMED,
        fromStatus: PermitStatus.SUSPENDED,
        toStatus: PermitStatus.ACTIVE,
        comment,
      },
    });

    return updatedPermit;
  });
}

export async function closePermit(
  userId: string,
  permitId: string,
  completionNotes: string
) {
  const permit = await prisma.permit.findUnique({
    where: { id: permitId },
  });

  if (!permit) {
    throw new Error("Permit not found");
  }

  // Only the requester can mark their own work as completed.
  if (permit.requesterId !== userId) {
    throw new Error("Only the requester can close their own permit");
  }

  if (permit.status !== PermitStatus.ACTIVE) {
    throw new Error("Only ACTIVE permits can be closed");
  }

  if (!completionNotes || !completionNotes.trim()) {
    throw new Error("Completion notes are required");
  }

  const now = new Date();

  const updatedPermit = await prisma.$transaction(async (tx) => {
    const updated = await tx.permit.update({
      where: { id: permitId },
      data: {
        status: PermitStatus.CLOSED,
        completionNotes: completionNotes.trim(),
        completedAt: now,
      },
    });

    await tx.permitAuditLog.create({
      data: {
        permitId,
        actorId: userId,
        action: AuditAction.CLOSED,
        fromStatus: PermitStatus.ACTIVE,
        toStatus: PermitStatus.CLOSED,
        newValue: {
          completionNotes: completionNotes.trim(),
          completedAt: now.toISOString(),
        },
        comment: "Requester marked the permit work as completed",
      },
    });

    return updated;
  });

  return updatedPermit;
}

export async function verifyClosedPermit(
  userId: string,
  permitId: string,
  comment?: string
) {
  const permit = await prisma.permit.findUnique({
    where: { id: permitId },
    include: {
      area: true,
    },
  });

  if (!permit) {
    throw new Error("Permit not found");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (
    user.role !== "SAFETY_OFFICER" &&
    user.role !== "ADMIN"
  ) {
    throw new Error(
      "Only the Safety Officer or Admin can verify permit closure"
    );
  }

  if (permit.status !== PermitStatus.CLOSED) {
    throw new Error("Only CLOSED permits can be verified");
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const updated = await tx.permit.update({
      where: { id: permitId },
      data: {
        status: PermitStatus.CLOSED_VERIFIED,
      },
    });

    await tx.permitAuditLog.create({
      data: {
        permitId,
        actorId: userId,
        action: AuditAction.VERIFIED,
        fromStatus: PermitStatus.CLOSED,
        toStatus: PermitStatus.CLOSED_VERIFIED,
        comment:
          comment?.trim() ||
          "Safety Officer verified permit closure",
        newValue: {
          verifiedAt: now.toISOString(),
        },
      },
    });

    return updated;
  });
}

export async function cancelPermit(
  permitId: string,
  actor: WorkflowUser,
  comment?: string
) {
  if (
    actor.role !== UserRole.REQUESTER &&
    actor.role !== UserRole.ADMIN
  ) {
    throw workflowError(
      "Only the requester or admin can cancel a permit"
    );
  }

  const permit = await prisma.permit.findUnique({
    where: { id: permitId },
  });

  if (!permit) {
    throw workflowError("Permit not found");
  }

  if (
    permit.status !== PermitStatus.DRAFT &&
    permit.status !== PermitStatus.PENDING_APPROVAL &&
    permit.status !== PermitStatus.APPROVED
  ) {
    throw workflowError(
      `Cannot cancel a permit in ${permit.status} status`
    );
  }

  if (
    actor.role !== UserRole.ADMIN &&
    permit.requesterId !== actor.userId
  ) {
    throw workflowError(
      "Only the permit requester can cancel this permit"
    );
  }

  return prisma.$transaction(async (tx) => {
    const fromStatus = permit.status;

    const updatedPermit = await tx.permit.update({
      where: { id: permitId },
      data: {
        status: PermitStatus.CANCELLED,
      },
    });

    await tx.permitAuditLog.create({
      data: {
        permitId,
        actorId: actor.userId,
        action: AuditAction.CANCELLED,
        fromStatus,
        toStatus: PermitStatus.CANCELLED,
        comment,
      },
    });

    return updatedPermit;
  });
}