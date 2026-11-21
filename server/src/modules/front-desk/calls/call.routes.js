import { Router } from "express";
import * as callController from "./call.controller.js";
import {
  validateCreateCallLog,
  validateGetCallLogs,
  validateGetCallLogById,
} from "./call.validation.js";

const router = Router();

// Retrieve all call logs with search, filter, and pagination
router.get("/call-logs", validateGetCallLogs, callController.getAllCallLogs);
router.get("/calls", validateGetCallLogs, callController.getAllCallLogs);
router.get("/", validateGetCallLogs, callController.getAllCallLogs);

// Create a new call log entry
router.post("/call-logs", validateCreateCallLog, callController.createCallLog);
router.post("/calls", validateCreateCallLog, callController.createCallLog);
router.post("/", validateCreateCallLog, callController.createCallLog);

// Retrieve a single call log by ID
router.get("/call-logs/:id", validateGetCallLogById, callController.getCallLogById);
router.get("/calls/:id", validateGetCallLogById, callController.getCallLogById);
router.get("/:id", validateGetCallLogById, callController.getCallLogById);

export default router;
