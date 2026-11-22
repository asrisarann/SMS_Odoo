import { Router } from "express";
import {
  getVirtualCardHandler,
  creditVirtualCardHandler,
  requestPaymentOtpHandler,
  payWithVirtualCardHandler,
  getTransactionsHandler,
} from "./wallet.controller.js";
import { authenticate } from "../../common/middlewares/auth.middleware.js";

const router = Router();

// 1. Request Payment OTP (Counter Staff or Public POS at bar/shop/courts)
router.post("/request-payment-otp", requestPaymentOtpHandler);

// 2. Complete Payment with Phone + OTP
router.post("/pay-with-otp", payWithVirtualCardHandler);
router.post("/pay", payWithVirtualCardHandler);

// 3. Credit / Top-up virtual card (Public or Authenticated)
router.post("/credit", creditVirtualCardHandler);
router.post("/topup", creditVirtualCardHandler);

// 4. Authenticated card inspection & history
router.get("/details", authenticate, getVirtualCardHandler);
router.get("/transactions", authenticate, getTransactionsHandler);
router.get("/:identifier", authenticate, getVirtualCardHandler);

export default router;
