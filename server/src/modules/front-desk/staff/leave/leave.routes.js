import { Router } from "express";
import {
  submitLeaveHandler,
  getAllLeavesHandler,
  getLeaveByIdHandler,
  approveLeaveHandler,
  rejectLeaveHandler,
  cancelLeaveHandler,
  getStaffLeaveBalanceHandler,
  getShiftCoverageSummaryHandler,
} from "./leave.controller.js";
import { authenticate, requireRoles } from "../../../../common/middlewares/auth.middleware.js";

const router = Router();

// 1. Shift Coverage Gap Analysis (Available to supervisors and staff)
router.get("/coverage", authenticate, getShiftCoverageSummaryHandler);
router.get("/coverage-summary", authenticate, getShiftCoverageSummaryHandler);

// 2. Staff Member Leave Quota Balance
router.get("/balance/:staffId", authenticate, getStaffLeaveBalanceHandler);
router.get("/:staffId/balance", authenticate, getStaffLeaveBalanceHandler);

// 3. Supervisor HR Approvals / Rejections (Admin / SuperAdmin / SubAdmin only)
router.patch("/:id/approve", authenticate, requireRoles("SUPERADMIN", "ADMIN", "SUBADMIN"), approveLeaveHandler);
router.patch("/:id/reject", authenticate, requireRoles("SUPERADMIN", "ADMIN", "SUBADMIN"), rejectLeaveHandler);

// 4. Cancel Leave Request (Applicant or Admin)
router.patch("/:id/cancel", authenticate, cancelLeaveHandler);

// 5. Submit Leave Request (Any authenticated employee/staff)
router.post("/", authenticate, submitLeaveHandler);

// 6. List Leave Requests & Details
router.get("/:id", authenticate, getLeaveByIdHandler);
router.get("/", authenticate, getAllLeavesHandler);

export default router;
