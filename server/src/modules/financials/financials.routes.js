import { Router } from "express";
import { getFinancialReportHandler } from "./financials.controller.js";
import { authenticate, requireRoles } from "../../common/middlewares/auth.middleware.js";

const router = Router();

// Only Super Admin and Admin can access executive financials
router.use(authenticate);
router.use(requireRoles("SUPERADMIN", "ADMIN"));

// Executive Financial Report endpoint
router.get("/", getFinancialReportHandler);
router.get("/report", getFinancialReportHandler);
router.get("/overview", getFinancialReportHandler);

export default router;
