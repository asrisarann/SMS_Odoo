import { Router } from "express";
import {
  getMenuItemsHandler,
  getMenuItemByIdHandler,
  toggleMenuItemAvailabilityHandler,
  createMenuItemHandler,
  updateMenuItemHandler,
  deleteMenuItemHandler,
  createCafeOrderHandler,
  getCafeOrdersHandler,
  getUserCafeOrdersHandler,
  updateCafeOrderStatusHandler,
  getBarStatsHandler,
  getOrderByIdHandler,
  getOrderReceiptHandler,
  downloadReceiptPdfHandler,
  getOrderSummaryHandler,
  getCustomerHandler,
} from "./cafe.controller.js";
import { authenticate, requireRoles } from "../../common/middlewares/auth.middleware.js";

const router = Router();

// Menu browsing endpoints (Public & Member)
router.get("/menu", getMenuItemsHandler);
router.get("/menu/:id", getMenuItemByIdHandler);

// Admin & Staff Menu Management (FastAPI parity)
router.post("/admin/menu", authenticate, requireRoles("BAR", "SUBADMIN", "ADMIN", "SUPERADMIN"), createMenuItemHandler);
router.post("/menu", authenticate, requireRoles("BAR", "SUBADMIN", "ADMIN", "SUPERADMIN"), createMenuItemHandler);
router.put("/admin/menu/:id", authenticate, requireRoles("BAR", "SUBADMIN", "ADMIN", "SUPERADMIN"), updateMenuItemHandler);
router.put("/menu/:id", authenticate, requireRoles("BAR", "SUBADMIN", "ADMIN", "SUPERADMIN"), updateMenuItemHandler);
router.delete("/admin/menu/:id", authenticate, requireRoles("BAR", "SUBADMIN", "ADMIN", "SUPERADMIN"), deleteMenuItemHandler);
router.delete("/menu/:id", authenticate, requireRoles("BAR", "SUBADMIN", "ADMIN", "SUPERADMIN"), deleteMenuItemHandler);
router.patch("/menu/:id/toggle", authenticate, requireRoles("BAR", "SUBADMIN", "ADMIN", "SUPERADMIN"), toggleMenuItemAvailabilityHandler);

// Member order placement & personal history
router.post("/orders", authenticate, createCafeOrderHandler);
router.get("/orders/mine", authenticate, getUserCafeOrdersHandler);
router.get("/customers/me/orders", authenticate, getUserCafeOrdersHandler);

// Order Receipts & PDF generation (FastAPI parity)
router.get("/orders/:id/receipt/pdf", authenticate, downloadReceiptPdfHandler);
router.get("/orders/:id/receipt", authenticate, getOrderReceiptHandler);

// Order summary & analytics (must precede dynamic /orders/:id)
router.get("/orders/summary", authenticate, requireRoles("BAR", "STAFF", "SUBADMIN", "ADMIN", "SUPERADMIN"), getOrderSummaryHandler);
router.get("/admin/orders/summary", authenticate, requireRoles("BAR", "STAFF", "SUBADMIN", "ADMIN", "SUPERADMIN"), getOrderSummaryHandler);

// Single order retrieval
router.get("/orders/:id", authenticate, getOrderByIdHandler);
router.get("/admin/orders/:id", authenticate, requireRoles("BAR", "STAFF", "SUBADMIN", "ADMIN", "SUPERADMIN"), getOrderByIdHandler);

// Orders listing & filtering
router.get("/orders", authenticate, requireRoles("BAR", "STAFF", "SUBADMIN", "ADMIN", "SUPERADMIN"), getCafeOrdersHandler);
router.get("/admin/orders", authenticate, requireRoles("BAR", "STAFF", "SUBADMIN", "ADMIN", "SUPERADMIN"), getCafeOrdersHandler);
router.patch("/orders/:id/status", authenticate, requireRoles("BAR", "STAFF", "SUBADMIN", "ADMIN", "SUPERADMIN"), updateCafeOrderStatusHandler);

// Executive bar stats
router.get("/stats", authenticate, requireRoles("BAR", "SUBADMIN", "ADMIN", "SUPERADMIN"), getBarStatsHandler);

// Customer details endpoint
router.get("/customers/:id", authenticate, getCustomerHandler);

export default router;
