import { Response } from "express";
import { AuthRequest } from "../middleware/auth";

import {
  submitPermit,
  approvePermit,
  rejectPermit,
} from "../services/permit-workflow.service";

export async function submitPermitController(
  req: AuthRequest,
  res: Response
) {
  try {
    const permit = await submitPermit(
      req.params.id,
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
      req.params.id,
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
      req.params.id,
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