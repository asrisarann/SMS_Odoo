import { Router } from "express";
import walkinRouter from "./walkins/walkin.routes.js";
import staffRouter from "./staff/staff.routes.js";
import callRouter from "./calls/call.routes.js";
import * as staffController from "./staff/staff.controller.js";

const frontDeskRouter = Router();

// GET /daily-activities - Directly accessible on front-desk router
frontDeskRouter.get("/daily-activities", staffController.getDailyActivities);

// Mount walk-in routes under /walkins
frontDeskRouter.use("/walkins", walkinRouter);

// Mount staff routes under /staff and root front-desk router (including schedules)
frontDeskRouter.use("/staff", staffRouter);
frontDeskRouter.use(staffRouter);

// Mount call routes under /calls and /call-logs
frontDeskRouter.use("/calls", callRouter);
frontDeskRouter.use("/call-logs", callRouter);

export default frontDeskRouter;
