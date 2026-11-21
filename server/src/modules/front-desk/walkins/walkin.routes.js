import { Router } from "express";
import * as walkinController from "./walkin.controller.js";
import { validateRegisterWalkin } from "./walkin.validation.js";

const router = Router();

// POST /walkins/register
router.post("/register", validateRegisterWalkin, walkinController.registerWalkin);

export default router;
