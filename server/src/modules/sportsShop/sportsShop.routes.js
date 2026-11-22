
import { Router } from "express";
import {
  getProducts,
  getProduct,
  addProduct,
  updateStock,
  checkout,
  getMemberOrders,
  getAllOrders,
  cancelOrder,
  updateOrderStatusHandler,
  getLowStockAlertsHandler,
  restockProductHandler,
  createStringingHandler,
  getAllStringingHandler,
  getStringingByIdHandler,
  updateStringingStatusHandler,
} from "./sportsShop.controller.js";
import { authenticate } from "../../common/middlewares/auth.middleware.js";

const router = Router();

// --- Product & Inventory Endpoints ---
router.get("/inventory/low-stock", getLowStockAlertsHandler);
router.get("/products/low-stock", getLowStockAlertsHandler);
router.post("/products/:id/restock", restockProductHandler);
router.post("/inventory/restock", restockProductHandler);

router.get("/products", getProducts);
router.get("/products/:id", getProduct);
router.post("/products", addProduct);
router.patch("/products/:id/stock", updateStock);

// --- Order & Checkout Endpoints ---
router.post("/checkout", checkout);
router.get("/orders", getAllOrders);
router.get("/orders/user/:userId", getMemberOrders);
router.patch("/orders/:id/status", updateOrderStatusHandler);
router.patch("/orders/:id/fulfill", updateOrderStatusHandler);
router.post("/orders/:id/cancel", cancelOrder);

// --- Racket Stringing & Equipment Service Endpoints ---
router.post("/stringing", createStringingHandler);
router.get("/stringing", getAllStringingHandler);
router.get("/stringing/:id", getStringingByIdHandler);
router.patch("/stringing/:id/status", updateStringingStatusHandler);

export default router;
