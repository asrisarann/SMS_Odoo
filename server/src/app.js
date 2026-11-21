import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import prisma from "./config/prisma.js";
import authRoutes from "./common/auth/auth.route.js";
import { authenticate, authorizeModule } from "./common/middlewares/auth.middleware.js";
import frontDeskRouter from "./modules/front-desk/index.js";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health and DB connectivity check endpoint
app.get("/api/health", async (req, res) => {
  try {
    const dbResult = await prisma.$queryRaw`SELECT 1::int as result, current_database()::text as database`;
    return res.status(200).json({
      status: "ok",
      database: "connected",
      dbName: dbResult[0]?.database || "neondb",
      neonBranch: process.env.NEON_BRANCH || "production",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check error:", error);
    return res.status(500).json({
      status: "error",
      database: "disconnected",
      message: error.message,
    });
  }
});

export default app;
