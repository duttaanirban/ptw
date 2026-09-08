import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { createPermitController } from "../controllers/permit.controller";
import {
  submitPermitController,
  approvePermitController,
  rejectPermitController,
} from "../controllers/permit-workflow.controller";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("REQUESTER", "ADMIN"),
  createPermitController
);
router.post(
  "/:id/submit",
  authenticate,
  authorize("REQUESTER", "ADMIN"),
  submitPermitController
);

router.post(
  "/:id/approve",
  authenticate,
  authorize("AREA_OWNER", "SAFETY_OFFICER", "ADMIN"),
  approvePermitController
);

router.post(
  "/:id/reject",
  authenticate,
  authorize("AREA_OWNER", "SAFETY_OFFICER", "ADMIN"),
  rejectPermitController
);

export default router;