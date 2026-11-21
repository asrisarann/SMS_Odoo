import { Router } from "express";
import walkinRouter from "./walkins/walkin.routes.js";

const frontDeskRouter = Router();

// Mount walk-in routes under /walkins
frontDeskRouter.use("/walkins", walkinRouter);

export default frontDeskRouter;
