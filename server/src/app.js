import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import prisma from "./config/prisma.js";
import sportsShopRouter from "./modules/sportsShop/sportsShop.routes.js";
import authRoutes from "./common/auth/auth.route.js";
import { authenticate, authorizeModule } from "./common/middlewares/auth.middleware.js";

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

app.use("/api/shop", sportsShopRouter);

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

// Authentication Routes
app.use("/api/auth", authRoutes);

// Example protected module routes demonstrating role & module-based access
// Sub-admin of 'staff' can access /api/modules/staff, Admin can access all modules
app.get("/api/modules/staff", authenticate, authorizeModule("staff"), (req, res) => {
  res.json({
    message: "Welcome to the Staff module. Authorized successfully.",
    user: req.user,
  });
});

// Sub-admin of 'sports' can access /api/modules/sports, Admin can access all modules
app.get("/api/modules/sports", authenticate, authorizeModule("sports"), (req, res) => {
  res.json({
    message: "Welcome to the Sports module. Authorized successfully.",
    user: req.user,
  });
});

export default app;
