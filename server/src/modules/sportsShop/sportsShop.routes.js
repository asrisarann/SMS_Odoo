
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
} from "./sportsShop.controller.js";

const router = Router();

// --- Product Endpoints ---
router.get("/products", getProducts);
router.get("/products/:id", getProduct);
router.post("/products", addProduct);
router.patch("/products/:id/stock", updateStock);

// --- Order & Checkout Endpoints ---
router.post("/checkout", checkout);
router.get("/orders", getAllOrders);
router.get("/orders/user/:userId", getMemberOrders);
router.post("/orders/:id/cancel", cancelOrder);

export default router;
