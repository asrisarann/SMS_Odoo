import { Router } from "express";
import walkinRouter from "./walkins/walkin.routes.js";
import staffRouter from "./staff/staff.routes.js";
import scheduleRouter from "./staff/schedule/schedule.routes.js";
import leaveRouter from "./staff/leave/leave.routes.js";
import callRouter from "./calls/call.routes.js";
import dailyActivitiesRouter from "./daily-activities/daily-activities.routes.js";
import memberRouter from "./members/member.routes.js";

const frontDeskRouter = Router();

// 1. Specific literal resource routes
frontDeskRouter.use("/members", memberRouter);
frontDeskRouter.use("/daily-activities", dailyActivitiesRouter);
frontDeskRouter.use("/walkins", walkinRouter);
frontDeskRouter.use("/calls", callRouter);
frontDeskRouter.use("/call-logs", callRouter);
frontDeskRouter.use("/schedules", scheduleRouter);
frontDeskRouter.use("/schedule", scheduleRouter);
frontDeskRouter.use("/leaves", leaveRouter);
frontDeskRouter.use("/leave", leaveRouter);
frontDeskRouter.use("/staff-leaves", leaveRouter);

// 2. Staff management routes under /staff
frontDeskRouter.use("/staff", staffRouter);

export default frontDeskRouter;
