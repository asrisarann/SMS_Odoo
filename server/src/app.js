import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import prisma from "./config/prisma.js";
import authRoutes from "./common/auth/auth.route.js";
import sportsRoutes from "./modules/sports/routes/sports.route.js";
import bookingRoutes from "./modules/sports/routes/booking.route.js";
import adminSportsRoutes from "./modules/sports/routes/admin.route.js";
import { superAdminRoutes } from "./modules/superAdmin/index.js";
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

// Sports & Court Booking Routes
app.use("/api/sports", sportsRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin/sports", adminSportsRoutes);

// Super Admin General Management Routes (Access to all database models across modules)
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/admin", superAdminRoutes);

// Protected module routes demonstrating role & module-based access
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
