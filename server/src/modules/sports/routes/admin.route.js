import { Router } from "express";
import {
  getAdminPricing,
  updateAdminPricing,
  getAdminConfig,
  updateAdminConfig,
} from "../controllers/admin.controller.js";
import { authenticate, requireRoles } from "../../../common/middlewares/auth.middleware.js";

const router = Router();

// All admin sports routes require ADMIN role
router.get("/pricing", authenticate, requireRoles("ADMIN"), getAdminPricing);
router.put("/pricing", authenticate, requireRoles("ADMIN"), updateAdminPricing);
router.get("/config", authenticate, requireRoles("ADMIN"), getAdminConfig);
router.put("/config", authenticate, requireRoles("ADMIN"), updateAdminConfig);

export default router;
