import { Router } from "express";
import * as dailyActivitiesController from "./daily-activities.controller.js";

const router = Router();

// GET /daily-activities
router.get("/", dailyActivitiesController.getDailyActivities);

export default router;
