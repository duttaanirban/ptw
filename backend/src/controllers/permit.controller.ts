import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { createPermit } from "../services/permit.service";

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