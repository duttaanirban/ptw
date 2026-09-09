import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  createPermit,
  updatePermit,
} from "../services/permit.service";

export async function createPermitController(
  req: AuthRequest,
  res: Response
) {
  try {
    const permit = await createPermit(
      req.user!.userId,
      req.body
    );

    return res.status(201).json({
      message: "Permit created successfully",
      permit,
    });
  } catch (error) {
    console.error("Create permit error:", error);

    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Unable to create permit",
    });
  }
}

export async function updatePermitController(
  req: AuthRequest,
  res: Response
) {
  try {
    const permitId = req.params.id;

    if (typeof permitId !== "string") {
      return res.status(400).json({
        message: "Permit ID is required",
      });
    }

    const permit = await updatePermit(
      req.user!.userId,
      permitId,
      req.body
    );

    return res.json({
      message: "Permit updated successfully",
      permit,
    });
  } catch (error: any) {
    console.error(error);

    return res.status(400).json({
      message: error.message,
    });
  }
}