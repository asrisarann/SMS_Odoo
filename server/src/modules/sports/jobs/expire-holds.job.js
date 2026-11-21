import prisma from "../../../config/prisma.js";
import { formatUTCToKolkata } from "../utils/slot.utils.js";
import { broadcastBookingEvent } from "../sockets/booking.socket.js";

let intervalId = null;

/**
 * Periodically cleanup expired temporary holds (status: 'HELD' and expiresAt <= now).
 * Marks them 'EXPIRED' and broadcasts real-time release events.
 */
export const cleanupExpiredHolds = async () => {
  try {
    const now = new Date();
    const expiredHolds = await prisma.sportsBooking.findMany({
      where: {
        status: "HELD",
        expiresAt: {
          lte: now,
        },
      },
      select: {
        id: true,
        whichCourt: true,
        slot: true,
      },
    });

    if (expiredHolds.length > 0) {
      const ids = expiredHolds.map((h) => h.id);
      await prisma.sportsBooking.updateMany({
        where: { id: { in: ids } },
        data: { status: "EXPIRED" },
      });

      for (const hold of expiredHolds) {
        const { date } = formatUTCToKolkata(hold.slot);
        broadcastBookingEvent("booking:hold_expired", hold.whichCourt, date, {
          bookingId: hold.id,
        });
      }
    }
  } catch (error) {
    console.error("Error in cleanupExpiredHolds job:", error.message);
  }
};

/**
 * Start the background expiration worker.
 */
export const startExpireHoldsJob = (intervalMs = 30000) => {
  if (intervalId) return;
  intervalId = setInterval(cleanupExpiredHolds, intervalMs);
};

/**
 * Stop the background expiration worker.
 */
export const stopExpireHoldsJob = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};
