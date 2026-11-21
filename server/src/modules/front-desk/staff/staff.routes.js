import { Router } from "express";
import * as staffController from "./staff.controller.js";
import scheduleRouter from "./schedule/schedule.routes.js";

const router = Router();

// GET /daily-activities - Retrieve today's check-ins, incoming calls, and outgoing calls
router.get("/daily-activities", staffController.getDailyActivities);

// Staff Schedule routes - Mounted under /schedules and /schedule
router.use("/schedules", scheduleRouter);
router.use("/schedule", scheduleRouter);

export default router;
