import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import {
  createPermitController,
  updatePermitController,
  getPermitByIdController,
  getPermitsController,
  getPermitOptionsController,
} from "../controllers/permit.controller";
import {
  submitPermitController,
  approvePermitController,
  rejectPermitController,
  activatePermitController,
  suspendPermitController,
  resumePermitController,
  closePermitController,
  verifyClosedPermitController,
  cancelPermitController,
} from "../controllers/permit-workflow.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  getPermitsController
);

router.get(
  "/options",
  authenticate,
  getPermitOptionsController
);

router.get(
  "/:id",
  authenticate,
  getPermitByIdController
);

router.post(
  "/",
  authenticate,
  authorize("REQUESTER", "ADMIN"),
  createPermitController
);

router.patch(
  "/:id",
  authenticate,
  authorize("REQUESTER", "ADMIN"),
  updatePermitController
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

router.post(
  "/:id/activate",
  authenticate,
  authorize("AREA_OWNER", "SAFETY_OFFICER", "ADMIN"),
  activatePermitController
);

router.post(
  "/:id/suspend",
  authenticate,
  authorize("AREA_OWNER", "SAFETY_OFFICER", "ADMIN"),
  suspendPermitController
);

router.post(
  "/:id/resume",
  authenticate,
  authorize("AREA_OWNER", "SAFETY_OFFICER", "ADMIN"),
  resumePermitController
);

router.post(
  "/:id/close",
  authenticate,
  authorize("REQUESTER", "ADMIN"),
  closePermitController
);

router.post(
  "/:id/verify-close",
  authenticate,
  authorize("SAFETY_OFFICER", "ADMIN"),
  verifyClosedPermitController
);

router.post(
  "/:id/cancel",
  authenticate,
  authorize("REQUESTER", "ADMIN"),
  cancelPermitController
);

export default router;