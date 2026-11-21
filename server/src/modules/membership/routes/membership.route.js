import { Router } from "express";
import { getExpiringMembers, triggerExpiryCheck } from "../controllers/membership.controller.js";
import { authenticate, requireRoles } from "../../../common/middlewares/auth.middleware.js";

const router = Router();

// Retrieve members whose membership is expiring in 2 days (or ?days=X)
router.get("/expiring", authenticate, requireRoles("ADMIN", "SUBADMIN"), getExpiringMembers);

// Manually trigger scanning and sending expiry reminder emails
router.post("/trigger-expiry-check", authenticate, requireRoles("ADMIN"), triggerExpiryCheck);

export default router;
