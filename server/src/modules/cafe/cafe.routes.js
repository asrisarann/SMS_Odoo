import { Router } from "express";
import {
  getMenuItemsHandler,
  toggleMenuItemAvailabilityHandler,
  createCafeOrderHandler,
  getCafeOrdersHandler,
  getUserCafeOrdersHandler,
  updateCafeOrderStatusHandler,
  getBarStatsHandler,
} from "./cafe.controller.js";
import { authenticate, requireRoles } from "../../common/middlewares/auth.middleware.js";

const router = Router();

// Public / Member menu browsing
router.get("/menu", getMenuItemsHandler);

// Member order endpoints
router.post("/orders", authenticate, createCafeOrderHandler);
router.get("/orders/mine", authenticate, getUserCafeOrdersHandler);

// Staff / KDS / Admin operations
router.get("/orders", authenticate, requireRoles("BAR", "STAFF", "SUBADMIN", "ADMIN", "SUPERADMIN"), getCafeOrdersHandler);
router.patch("/orders/:id/status", authenticate, requireRoles("BAR", "STAFF", "SUBADMIN", "ADMIN", "SUPERADMIN"), updateCafeOrderStatusHandler);
router.patch("/menu/:id/toggle", authenticate, requireRoles("BAR", "SUBADMIN", "ADMIN", "SUPERADMIN"), toggleMenuItemAvailabilityHandler);
router.get("/stats", authenticate, requireRoles("BAR", "SUBADMIN", "ADMIN", "SUPERADMIN"), getBarStatsHandler);

export default router;
