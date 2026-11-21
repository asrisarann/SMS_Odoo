import http from "node:http";
import app from "./app.js";
import prisma from "./config/prisma.js";
import { initSocket } from "./modules/sports/sockets/booking.socket.js";
import { startExpireHoldsJob, stopExpireHoldsJob } from "./modules/sports/jobs/expire-holds.job.js";

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);

// Initialize Socket.IO
initSocket(httpServer);

// Start background expired holds cleanup worker (runs every 30 seconds)
startExpireHoldsJob(30000);

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown handling
const handleShutdown = async (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  stopExpireHoldsJob();
  httpServer.close(async () => {
    try {
      await prisma.$disconnect();
      console.log("Database connection closed.");
    } catch (err) {
      console.error("Error disconnecting database:", err);
    }
    process.exit(0);
  });
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
