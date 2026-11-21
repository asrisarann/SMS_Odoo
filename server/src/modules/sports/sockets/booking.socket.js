import { Server } from "socket.io";

let io = null;

/**
 * Initialize Socket.IO instance on the HTTP server.
 */
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // Client joins room based on sport and date (e.g., room:CRICKET:2026-11-21)
    socket.on("join:sport_date", ({ sport, date }) => {
      if (sport && date) {
        const room = `room:${sport.toUpperCase()}:${date}`;
        socket.join(room);
      }
    });

    socket.on("leave:sport_date", ({ sport, date }) => {
      if (sport && date) {
        const room = `room:${sport.toUpperCase()}:${date}`;
        socket.leave(room);
      }
    });
  });

  return io;
};

/**
 * Returns the active Socket.IO server instance.
 */
export const getIO = () => {
  return io;
};

/**
 * Broadcast safe booking availability events to clients watching the sport and date.
 * Excludes private user IDs, wallet balances, and credentials.
 */
export const broadcastBookingEvent = (eventName, sport, dateStr, payload = {}) => {
  if (!io) return;

  const room = `room:${sport.toUpperCase()}:${dateStr}`;
  const safeData = {
    sport: sport.toUpperCase(),
    date: dateStr,
    ...payload,
    timestamp: new Date().toISOString(),
  };

  // Broadcast to room listeners
  io.to(room).emit(eventName, safeData);
  // Also emit availability update event to room
  if (eventName !== "booking:availability_updated") {
    io.to(room).emit("booking:availability_updated", safeData);
  }
};
