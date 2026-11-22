import prisma from "../../../config/prisma.js";
import { generateDailySlots, formatUTCToKolkata, isFridaySocialPlay } from "../utils/slot.utils.js";
import { getSportPricing, getAllSportPricing } from "./pricing.service.js";

/**
 * Get all available sports with their capacity and hours.
 */
export const getSportsList = async () => {
  return getAllSportPricing();
};

/**
 * Get slot availability for a sport on a given date (YYYY-MM-DD in Asia/Kolkata).
 * Takes into account CONFIRMED bookings and active HELD bookings (< 3 mins old).
 * Per PRD: Sessions last 1 hour, slots open every 30 minutes, Friday evening social play.
 */
export const getSportSlotsAvailability = async (sport, dateStr) => {
  const pricing = await getSportPricing(sport);
  const normalizedSport = pricing.sport;

  // Generate 1-hour session slots opening every 30 minutes
  const rawSlots = generateDailySlots(
    dateStr,
    pricing.openTime,
    pricing.closeTime,
    60, // 1 hour session duration
    30  // new slot opens every half hour
  );

  if (rawSlots.length === 0) {
    return [];
  }

  const startOfDayUTC = rawSlots[0].slotStartTime;
  const endOfDayUTC = rawSlots[rawSlots.length - 1].slotEndTime;
  const now = new Date();

  // Query all non-cancelled, non-expired bookings for this sport that overlap with the day
  const bookings = await prisma.sportsBooking.findMany({
    where: {
      whichCourt: normalizedSport,
      endTime: { gt: startOfDayUTC },
      slot: { lt: endOfDayUTC },
      OR: [
        { status: "CONFIRMED" },
        {
          status: "HELD",
          expiresAt: { gt: now },
        },
      ],
    },
    select: {
      slot: true,
      endTime: true,
      playerCount: true,
      status: true,
      expiresAt: true,
    },
  });

  // Build response for each slot with overlap calculation
  return rawSlots.map((slot) => {
    const isSocial = Boolean(slot.isSocialPlay);
    // Friday night social play allows shared court capacity among many players
    const maxCapacity = isSocial
      ? Math.max(pricing.capacity * 3, 16)
      : pricing.capacity;

    let bookedCapacity = 0;
    let heldCapacity = 0;

    for (const b of bookings) {
      const bEndTime = b.endTime || new Date(b.slot.getTime() + 60 * 60 * 1000);
      // Overlap check: existing booking overlaps with slot if b.slot < slot.slotEndTime && bEndTime > slot.slotStartTime
      if (b.slot < slot.slotEndTime && bEndTime > slot.slotStartTime) {
        if (b.status === "CONFIRMED") {
          bookedCapacity += b.playerCount;
        } else if (b.status === "HELD" && b.expiresAt > now) {
          heldCapacity += b.playerCount;
        }
      }
    }

    const totalOccupied = bookedCapacity + heldCapacity;
    const availableCapacity = Math.max(0, maxCapacity - totalOccupied);
    const isFull = availableCapacity === 0;

    let status = "AVAILABLE";
    if (slot.isPast) {
      status = "PAST";
    } else if (isFull) {
      status = "FULL";
    }

    return {
      slotStartTime: slot.slotStartTime.toISOString(),
      slotEndTime: slot.slotEndTime.toISOString(),
      date: slot.date,
      startTime: slot.startTimeStr,
      endTime: slot.endTimeStr,
      label: slot.label,
      isPast: slot.isPast,
      sessionDurationMinutes: slot.sessionDurationMinutes || 60,
      isSocialPlay: isSocial,
      maxCapacity,
      bookedCapacity,
      heldCapacity,
      availableCapacity,
      status,
      basePrice: Number(pricing.basePrice),
    };
  });
};
