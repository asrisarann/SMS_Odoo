import http from "node:http";
import app from "./app.js";
import { initSocket } from "./modules/sports/sockets/booking.socket.js";
import { startExpireHoldsJob } from "./modules/sports/jobs/expire-holds.job.js";
import { startMembershipExpiryJob } from "./modules/membership/jobs/membership-expiry.job.js";

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);

// Initialize Socket.IO
initSocket(httpServer);

// Start background expired holds cleanup worker (runs every 30 seconds)
startExpireHoldsJob(30000);

// Start background membership expiry reminder worker (checks users expiring in 2 days)
startMembershipExpiryJob(3600000, 2);

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

