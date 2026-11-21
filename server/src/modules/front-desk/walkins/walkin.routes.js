import { Router } from "express";
import * as walkinController from "./walkin.controller.js";
import {
  validateRegisterWalkin,
  validateGetWalkins,
  validateGetWalkinByPhone,
} from "./walkin.validation.js";

const router = Router();

// GET /walkins - Retrieve all walk-in records with search, filter, and pagination
router.get("/", validateGetWalkins, walkinController.getAllWalkins);

// GET /walkins/stats - Retrieve walk-in and membership statistics (must precede /:phone)
router.get("/stats", walkinController.getWalkinStats);

// POST /walkins/register - Register a walk-in visitor
router.post("/register", validateRegisterWalkin, walkinController.registerWalkin);

// GET /walkins/:phone - Retrieve a walk-in record by phone number
router.get("/:phone", validateGetWalkinByPhone, walkinController.getWalkinByPhone);

export default router;
