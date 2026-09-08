import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { createPermitController } from "../controllers/permit.controller";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("REQUESTER", "ADMIN"),
  createPermitController
);

export default router;