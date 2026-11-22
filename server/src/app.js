import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prisma from "./config/prisma.js";
import sportsShopRouter from "./modules/sportsShop/sportsShop.routes.js";
import authRoutes from "./common/auth/auth.route.js";
import sportsRoutes from "./modules/sports/routes/sports.route.js";
import bookingRoutes from "./modules/sports/routes/booking.route.js";
import { superAdminRoutes } from "./modules/superAdmin/index.js";
import { membershipRoutes } from "./modules/membership/index.js";
import { authenticate, authorizeModule } from "./common/middlewares/auth.middleware.js";
import frontDeskRouter from "./modules/front-desk/index.js";
import crmRoutes from "./modules/crm/crm.routes.js";
import walletRoutes from "./modules/wallet/wallet.routes.js";
import financialsRoutes from "./modules/financials/financials.routes.js";
import staffLeaveRoutes from "./modules/front-desk/staff/leave/leave.routes.js";
import { cafeRoutes } from "./modules/cafe/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
app.use("/api/sport-shop", sportsShopRouter);
app.use("/api/sports/shop", sportsShopRouter);
// Serve Interactive HTML API Documentation
app.get(["/api/docs", "/docs"], (req, res) => {
  res.sendFile(path.resolve(__dirname, "../../api-docs.html"));
});

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

// Auth routes (accessible via /api/auth or /auth)
app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);

// Sports & Court Booking Routes
app.use("/api/sports", sportsRoutes);
app.use("/api/bookings", bookingRoutes);

// Super Admin General Management Routes (Access to all database models across modules)
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/admin", superAdminRoutes);

// Membership Routes (Expiry checking and reminders)
app.use("/api/membership", membershipRoutes);

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

// CRM & Online Inquiries / Leads Pipeline
app.use("/api/enquiries", crmRoutes);
app.use("/api/crm", crmRoutes);

// Virtual Card & Club Wallet Routes
app.use("/api/wallet", walletRoutes);
app.use("/api/virtual-card", walletRoutes);

// Executive Consolidated Financials & Monthly Reports
app.use("/api/financials", financialsRoutes);
app.use("/api/super-admin/financials", financialsRoutes);

// Staff Leave Management & HR Approvals (Scene 4)
app.use("/api/staff/leaves", staffLeaveRoutes);
app.use("/api/leaves", staffLeaveRoutes);
app.use("/api/super-admin/staff/leaves", staffLeaveRoutes);

// Court-Side Bar & Cafeteria Routes
app.use("/api/cafe", cafeRoutes);
app.use("/api/bar", cafeRoutes);
app.use("/bar", cafeRoutes);

// Front Desk module routes
app.use("/api/front-desk", frontDeskRouter);
app.use("/api", frontDeskRouter);
app.use(frontDeskRouter);

export default app;
