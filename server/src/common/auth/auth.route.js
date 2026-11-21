import { Router } from "express";
import {
  sendRegisterOtp,
  register,
  verifyRegisterOtp,
  login,
  verifyLoginOtp,
  createSubAdmin,
  forgotPassword,
  resetPassword,
  updateProfile,
  logout,
  getMe,
} from "./auth.controller.js";
import { authenticate, requireRoles } from "../middlewares/auth.middleware.js";

const router = Router();

// Public Authentication Endpoints
// Step 1: User clicks "Send OTP" button
router.post("/send-register-otp", sendRegisterOtp);
router.post("/send-otp", sendRegisterOtp); // Convenience alias

// Step 2: User enters OTP with details and registers
router.post("/register", register);
router.post("/verify-register", verifyRegisterOtp);

// Login endpoints
router.post("/login" , authenticate ,   login);
router.post("/verify-login", verifyLoginOtp);

// Password recovery endpoints
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Logout
router.post("/logout", logout);

// Protected Endpoints
router.get("/me", authenticate, getMe);
router.put("/profile", authenticate, updateProfile);

// Admin-Only: Create Sub-Admin with assigned module
router.post("/create-subadmin", authenticate, requireRoles("ADMIN"), createSubAdmin);

export default router;
