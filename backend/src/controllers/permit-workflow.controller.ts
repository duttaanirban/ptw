import { Response } from "express";
import { AuthRequest } from "../middleware/auth";

import {
  submitPermit,
  approvePermit,
  rejectPermit,
  activatePermit,
  suspendPermit,
  resumePermit,
  closePermit,
  verifyClosedPermit,
  cancelPermit,
} from "../services/permit-workflow.service";

function getPermitId(req: AuthRequest): string {
  const permitId = req.params.id;

  if (typeof permitId !== "string") {
    throw new Error("Permit id is required");
  }

  return permitId;
}

export async function submitPermitController(
  req: AuthRequest,
  res: Response
) {
  try {
    const permit = await submitPermit(
      getPermitId(req),
      {
        userId: req.user!.userId,
        role: req.user!.role as any,
      }
    );

    return res.json({
      message: "Permit submitted for approval",
      permit,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Unable to submit permit",
    });
  }
}

export async function approvePermitController(
  req: AuthRequest,
  res: Response
) {
  try {
    const result = await approvePermit(
      getPermitId(req),
      {
        userId: req.user!.userId,
        role: req.user!.role as any,
      },
      req.body?.comment
    );

    return res.json({
      message: "Permit approval processed",
      result,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Unable to approve permit",
    });
  }
}

export async function rejectPermitController(
  req: AuthRequest,
  res: Response
) {
  try {
    const result = await rejectPermit(
      getPermitId(req),
      {
        userId: req.user!.userId,
        role: req.user!.role as any,
      },
      req.body?.comment
    );

    return res.json({
      message: "Permit rejected",
      result,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Unable to reject permit",
    });
  }
}

export async function activatePermitController(
  req: AuthRequest,
  res: Response
) {
  try {
    const permit = await activatePermit(
      getPermitId(req),
      {
        userId: req.user!.userId,
        role: req.user!.role as any,
      },
      req.body?.comment
    );

    return res.json({
      message: "Permit activated",
      permit,
    });
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Unable to activate permit",
    });
  }
}

export async function suspendPermitController(
  req: AuthRequest,
  res: Response
) {
  try {
    const permit = await suspendPermit(
      getPermitId(req),
      {
        userId: req.user!.userId,
        role: req.user!.role as any,
      },
      req.body?.comment
    );

    return res.json({
      message: "Permit suspended",
      permit,
    });
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Unable to suspend permit",
    });
  }
}

export async function resumePermitController(
  req: AuthRequest,
  res: Response
) {
  try {
    const permit = await resumePermit(
      getPermitId(req),
      {
        userId: req.user!.userId,
        role: req.user!.role as any,
      },
      req.body?.comment
    );

    return res.json({
      message: "Permit resumed",
      permit,
    });
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Unable to resume permit",
    });
  }
}

export async function closePermitController(
  req: AuthRequest,
  res: Response
) {
  try {
    const permit = await closePermit(
      getPermitId(req),
      {
        userId: req.user!.userId,
        role: req.user!.role as any,
      },
      req.body?.comment
    );

    return res.json({
      message: "Permit closed",
      permit,
    });
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Unable to close permit",
    });
  }
}

export async function verifyClosedPermitController(
  req: AuthRequest,
  res: Response
) {
  try {
    const permit = await verifyClosedPermit(
      getPermitId(req),
      {
        userId: req.user!.userId,
        role: req.user!.role as any,
      },
      req.body?.comment
    );

    return res.json({
      message: "Permit closure verified",
      permit,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Unable to verify permit closure",
    });
  }
}

export async function cancelPermitController(
  req: AuthRequest,
  res: Response
) {
  try {
    const permit = await cancelPermit(
      getPermitId(req),
      {
        userId: req.user!.userId,
        role: req.user!.role as any,
      },
      req.body?.comment
    );

    return res.json({
      message: "Permit cancelled",
      permit,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Unable to cancel permit",
    });
  }
}