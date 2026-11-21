import prisma from "../../../config/prisma.js";
import { generateDailySlots, formatUTCToKolkata } from "../utils/slot.utils.js";
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
 */
export const getSportSlotsAvailability = async (sport, dateStr) => {
  const pricing = await getSportPricing(sport);
  const normalizedSport = pricing.sport;

  // Generate all 30-minute slots for the day
  const rawSlots = generateDailySlots(
    dateStr,
    pricing.openTime,
    pricing.closeTime,
    30
  );

  if (rawSlots.length === 0) {
    return [];
  }

  const startOfDayUTC = rawSlots[0].slotStartTime;
  const endOfDayUTC = rawSlots[rawSlots.length - 1].slotEndTime;
  const now = new Date();

  // Query all non-cancelled, non-expired bookings for this sport on this day
  const bookings = await prisma.sportsBooking.findMany({
    where: {
      whichCourt: normalizedSport,
      slot: {
        gte: startOfDayUTC,
        lt: endOfDayUTC,
      },
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
      playerCount: true,
      status: true,
      expiresAt: true,
    },
  });

  // Aggregate booked and held count by slot time
  const usageMap = new Map();
  for (const b of bookings) {
    const key = b.slot.toISOString();
    const current = usageMap.get(key) || { confirmed: 0, held: 0 };
    if (b.status === "CONFIRMED") {
      current.confirmed += b.playerCount;
    } else if (b.status === "HELD" && b.expiresAt > now) {
      current.held += b.playerCount;
    }
    usageMap.set(key, current);
  }

  // Build response for each slot
  return rawSlots.map((slot) => {
    const key = slot.slotStartTime.toISOString();
    const usage = usageMap.get(key) || { confirmed: 0, held: 0 };

    const maxCapacity = pricing.capacity;
    const bookedCapacity = usage.confirmed;
    const heldCapacity = usage.held;
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
      maxCapacity,
      bookedCapacity,
      heldCapacity,
      availableCapacity,
      status,
      basePrice: Number(pricing.basePrice),
    };
  });
};
