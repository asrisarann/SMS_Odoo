import { Router } from "express";
import * as scheduleController from "./schedule.controller.js";
import {
  validateCreateSchedule,
  validateGetSchedules,
  validateGetScheduleById,
  validateUpdateSchedule,
  validateDeleteSchedule,
} from "./schedule.validation.js";

const router = Router();

// GET /schedules - List schedules with staff/date filters and pagination
router.get("/schedules", validateGetSchedules, scheduleController.getAllSchedules);
router.get("/", validateGetSchedules, scheduleController.getAllSchedules);

// POST /schedules - Create staff schedule with overlap check
router.post("/schedules", validateCreateSchedule, scheduleController.createSchedule);
router.post("/", validateCreateSchedule, scheduleController.createSchedule);

// GET /schedules/:id - Get schedule by ID
router.get("/schedules/:id", validateGetScheduleById, scheduleController.getScheduleById);
router.get("/:id", validateGetScheduleById, scheduleController.getScheduleById);

// PATCH /schedules/:id - Update schedule
router.patch("/schedules/:id", validateUpdateSchedule, scheduleController.updateSchedule);
router.patch("/:id", validateUpdateSchedule, scheduleController.updateSchedule);

// DELETE /schedules/:id - Delete schedule
router.delete("/schedules/:id", validateDeleteSchedule, scheduleController.deleteSchedule);
router.delete("/:id", validateDeleteSchedule, scheduleController.deleteSchedule);

export default router;
