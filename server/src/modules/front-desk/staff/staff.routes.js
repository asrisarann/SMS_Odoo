import { Router } from "express";
import * as staffController from "./staff.controller.js";
import scheduleRouter from "./schedule/schedule.routes.js";
import leaveRouter from "./leave/leave.routes.js";

const router = Router();

// Staff Schedule routes - Mounted under /schedules and /schedule
router.use("/schedules", scheduleRouter);
router.use("/schedule", scheduleRouter);

// Staff Leave routes - Mounted under /leaves and /leave
router.use("/leaves", leaveRouter);
router.use("/leave", leaveRouter);

// Staff member list & details
router.get("/:id", staffController.getStaffById);
router.get("/", staffController.getAllStaff);

export default router;
