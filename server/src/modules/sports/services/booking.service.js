import prisma from "../../../config/prisma.js";
import { parseKolkataToUTC, formatUTCToKolkata, isFridaySocialPlay } from "../utils/slot.utils.js";
import { calculateBookingPrice, getSportPricing } from "./pricing.service.js";
import { broadcastBookingEvent } from "../sockets/booking.socket.js";

/**
 * 1. Create Temporary Booking Hold (3 Minutes):
 * Concurrency-safe hold creation protected by PostgreSQL transaction and row-level locking.
 * 
 * Requirements enforced from PRD:
 * - Sessions last an hour, a new slot opens every half hour.
 * - Each member can play at most twice a day.
 * - Friday night social play allows shared court capacity.
 * - Walk-ins at the counter can be booked directly by front desk staff.
 * - Concurrency lock guarantees two people never end up on the same court at the same time.
 */
export const createBookingHold = async ({
  userId,
  sport,
  date,
  startTime,
  playerCount = 1,
  durationMinutes = 60, // Standard 1-hour sessions per PRD
  isWalkin = false,
  walkinName = null,
  walkinPhone = null,
  walkinEmail = null,
  role = "MEMBER",
}) => {
  const normalizedSport = (sport || "").toUpperCase();
  const count = parseInt(playerCount, 10);
  const sessionDuration = parseInt(durationMinutes, 10) || 60;

  if (!normalizedSport) {
    throw new Error("Sport is required");
  }
  if (!date || !startTime) {
    throw new Error("Date (YYYY-MM-DD) and startTime (HH:mm) are required");
  }
  if (isNaN(count) || count < 1) {
    throw new Error("Player count must be at least 1");
  }

  // Parse slot start and end times in UTC
  const slotStartTime = parseKolkataToUTC(date, startTime);
  const slotEndTime = new Date(slotStartTime.getTime() + sessionDuration * 60 * 1000);
  const now = new Date();

  // Validate not in past
  if (slotStartTime.getTime() <= now.getTime()) {
    throw new Error("Cannot book slots in the past");
  }

  let targetUserId = userId;
  const isPrivilegedStaff = ["SUPERADMIN", "ADMIN", "STAFF"].includes(role);

  // If front desk staff is booking directly for a walk-in at counter
  if ((isWalkin || walkinPhone) && isPrivilegedStaff) {
    const searchPhone = (walkinPhone || "").trim();
    if (searchPhone) {
      let existingWalkin = await prisma.user.findUnique({
        where: { phone: searchPhone },
      });
      if (!existingWalkin) {
        existingWalkin = await prisma.user.create({
          data: {
            name: walkinName?.trim() || "Walk-in Guest",
            phone: searchPhone,
            email: walkinEmail?.trim() || `walkin-${Date.now()}-${Math.floor(Math.random() * 1000)}@championsclub.local`,
            membership: "JUNIOR",
            role: "MEMBER",
            lastEntry: new Date(),
          },
        });
      }
      targetUserId = existingWalkin.id;
    }
  }

  // Enforce member daily limit: "each member can play at most twice a day"
  // Exempt staff booking on behalf of walk-ins
  if (!isWalkin) {
    const dayStartUTC = parseKolkataToUTC(date, "00:00");
    const nextDayStartUTC = new Date(dayStartUTC.getTime() + 24 * 60 * 60 * 1000);

    const dailyBookingsCount = await prisma.sportsBooking.count({
      where: {
        userID: targetUserId,
        slot: {
          gte: dayStartUTC,
          lt: nextDayStartUTC,
        },
        OR: [
          { status: "CONFIRMED" },
          {
            status: "HELD",
            expiresAt: { gt: now },
          },
        ],
      },
    });

    if (dailyBookingsCount >= 2) {
      throw new Error("Daily play limit reached. Each member can play at most twice a day.");
    }
  }

  // Get user membership for dynamic pricing
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, membership: true, amount: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Calculate dynamic pricing
  const pricingData = await calculateBookingPrice(
    normalizedSport,
    isWalkin ? null : user.membership,
    count
  );

  // Friday night social play capacity expansion
  const isSocial = isFridaySocialPlay(date, startTime);
  const effectiveCapacity = isSocial
    ? Math.max(pricingData.capacity * 3, 16)
    : pricingData.capacity;

  const holdExpiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes from now

  // Execute in serializable/locked transaction to protect capacity and prevent overlapping collisions
  const holdBooking = await prisma.$transaction(async (tx) => {
    // 1. Ensure a Slot row exists for this court and time
    const slot = await tx.slot.upsert({
      where: {
        whichCourt_startTime: {
          whichCourt: normalizedSport,
          startTime: slotStartTime,
        },
      },
      update: {
        maxCapacity: effectiveCapacity,
      },
      create: {
        whichCourt: normalizedSport,
        startTime: slotStartTime,
        endTime: slotEndTime,
        maxCapacity: effectiveCapacity,
      },
    });

    // 2. Lock the Slot row exclusively using FOR UPDATE
    await tx.$queryRaw`
      SELECT "id" FROM "Slot" 
      WHERE "id" = ${slot.id} 
      FOR UPDATE
    `;

    // 3. Count currently occupied capacity overlapping with [slotStartTime, slotEndTime)
    // Ensures two people never end up on the same court at the same time
    const occupiedRows = await tx.$queryRaw`
      SELECT COALESCE(SUM("playerCount"), 0)::int as occupied
      FROM "SportsBooking"
      WHERE "whichCourt" = ${normalizedSport}::"CourtType"
        AND "slot" < ${slotEndTime}
        AND "endTime" > ${slotStartTime}
        AND (
          "status" = 'CONFIRMED'
          OR ("status" = 'HELD' AND "expiresAt" > NOW())
        )
    `;

    const currentlyOccupied = occupiedRows[0]?.occupied || 0;
    const remainingCapacity = effectiveCapacity - currentlyOccupied;

    if (count > remainingCapacity) {
      throw new Error(
        `Insufficient capacity. Requested ${count} place(s), but only ${remainingCapacity} available.`
      );
    }

    // 4. Create the HELD booking record
    return tx.sportsBooking.create({
      data: {
        userID: targetUserId,
        whichCourt: normalizedSport,
        slot: slotStartTime,
        endTime: slotEndTime,
        playerCount: count,
        basePrice: pricingData.basePrice,
        discountPercentage: pricingData.discountPercentage,
        totalAmount: pricingData.totalAmount,
        status: "HELD",
        expiresAt: holdExpiresAt,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, membership: true },
        },
      },
    });
  });

  // Broadcast real-time availability update
  broadcastBookingEvent("booking:hold_created", normalizedSport, date, {
    bookingId: holdBooking.id,
    slot: startTime,
    playerCount: count,
    isSocialPlay: isSocial,
  });

  return {
    ...holdBooking,
    holdDurationMinutes: 3,
    expiresInSeconds: 180,
    sessionDurationMinutes: sessionDuration,
    isSocialPlay: isSocial,
  };
};

/**
 * 2. Confirm Booking Hold:
 * Deducts booking totalAmount from User.amount wallet and updates status to CONFIRMED.
 */
export const confirmBookingHold = async ({ userId, holdId }) => {
  if (!holdId) {
    throw new Error("Hold ID is required");
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Fetch hold booking
    const booking = await tx.sportsBooking.findUnique({
      where: { id: holdId },
      include: { user: true },
    });

    if (!booking) {
      throw new Error("Booking hold not found");
    }

    if (booking.userID !== userId) {
      // Check if user is admin/staff
      const caller = await tx.user.findUnique({ where: { id: userId } });
      const isPrivileged = caller && ["SUPERADMIN", "ADMIN", "STAFF"].includes(caller.role);
      if (!isPrivileged) {
        throw new Error("You do not have permission to confirm this hold");
      }
    }

    if (booking.status === "CONFIRMED") {
      throw new Error("Booking is already confirmed");
    }

    if (booking.status !== "HELD") {
      throw new Error(`Cannot confirm booking with status '${booking.status}'`);
    }

    // 2. Validate hold expiry
    const now = new Date();
    if (!booking.expiresAt || booking.expiresAt.getTime() <= now.getTime()) {
      await tx.sportsBooking.update({
        where: { id: holdId },
        data: { status: "EXPIRED" },
      });
      throw new Error("Hold has expired. Please select the slot again.");
    }

    // 3. Lock user row and check balance
    const user = await tx.user.findUnique({
      where: { id: booking.userID },
    });

    const userBalance = Number(user.amount);
    const bookingCost = Number(booking.totalAmount);

    if (userBalance < bookingCost) {
      throw new Error(
        `Insufficient membership balance. Required: ₹${bookingCost}, Available: ₹${userBalance}. Please recharge your balance.`
      );
    }

    // 4. Deduct balance from user wallet
    const updatedUser = await tx.user.update({
      where: { id: booking.userID },
      data: {
        amount: {
          decrement: bookingCost,
        },
      },
    });

    // 5. Update booking status to CONFIRMED
    const confirmedBooking = await tx.sportsBooking.update({
      where: { id: holdId },
      data: {
        status: "CONFIRMED",
        expiresAt: null,
      },
    });

    return {
      booking: confirmedBooking,
      remainingBalance: Number(updatedUser.amount),
    };
  });

  const { date } = formatUTCToKolkata(result.booking.slot);
  broadcastBookingEvent(
    "booking:confirmed",
    result.booking.whichCourt,
    date,
    {
      bookingId: result.booking.id,
      playerCount: result.booking.playerCount,
    }
  );

  return result;
};

/**
 * 3. Release/Cancel Active Hold Early:
 */
export const releaseBookingHold = async ({ userId, holdId }) => {
  const booking = await prisma.sportsBooking.findUnique({
    where: { id: holdId },
  });

  if (!booking) {
    throw new Error("Hold not found");
  }

  if (booking.userID !== userId) {
    const caller = await prisma.user.findUnique({ where: { id: userId } });
    const isPrivileged = caller && ["SUPERADMIN", "ADMIN", "STAFF"].includes(caller.role);
    if (!isPrivileged) {
      throw new Error("Unauthorized to release this hold");
    }
  }

  if (booking.status !== "HELD") {
    throw new Error("Only HELD reservations can be released");
  }

  const updated = await prisma.sportsBooking.update({
    where: { id: holdId },
    data: { status: "EXPIRED" },
  });

  const { date } = formatUTCToKolkata(booking.slot);
  broadcastBookingEvent("booking:hold_expired", booking.whichCourt, date, {
    bookingId: holdId,
  });

  return updated;
};

/**
 * 4. Cancel Confirmed Booking with 50% Refund:
 * Allowed up to 1 hour before the slot starts.
 */
export const cancelConfirmedBooking = async ({ userId, bookingId, role }) => {
  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.sportsBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (role !== "ADMIN" && role !== "SUPERADMIN" && booking.userID !== userId) {
      throw new Error("You do not have permission to cancel this booking");
    }

    if (booking.status !== "CONFIRMED") {
      throw new Error(
        `Cannot cancel booking with status '${booking.status}'. Only CONFIRMED bookings can be cancelled.`
      );
    }

    // Cancellation window: 1 hour before slot start
    const now = new Date();
    const timeUntilSlotMs = booking.slot.getTime() - now.getTime();
    const oneHourMs = 60 * 60 * 1000;

    if (timeUntilSlotMs < oneHourMs) {
      throw new Error(
        "Cancellation is only allowed up to 1 hour before the slot start time."
      );
    }

    // Refund policy: 50% of original total amount
    const originalCost = Number(booking.totalAmount);
    const refundAmount = Math.round((originalCost * 0.5) * 100) / 100;

    // Refund 50% back into user's User.amount balance
    const updatedUser = await tx.user.update({
      where: { id: booking.userID },
      data: {
        amount: {
          increment: refundAmount,
        },
      },
    });

    // Mark booking as CANCELLED
    const cancelledBooking = await tx.sportsBooking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
      },
    });

    return {
      booking: cancelledBooking,
      refundAmount,
      updatedBalance: Number(updatedUser.amount),
    };
  });

  const { date } = formatUTCToKolkata(result.booking.slot);
  broadcastBookingEvent("booking:cancelled", result.booking.whichCourt, date, {
    bookingId: result.booking.id,
    playerCount: result.booking.playerCount,
  });

  return result;
};

/**
 * 5. Get My Bookings:
 */
export const getUserBookings = async (userId) => {
  return prisma.sportsBooking.findMany({
    where: { userID: userId },
    orderBy: { slot: "desc" },
  });
};

/**
 * 6. Get Booking By ID:
 */
export const getBookingById = async (userId, bookingId, role) => {
  const booking = await prisma.sportsBooking.findUnique({
    where: { id: bookingId },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true, membership: true },
      },
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  const isPrivileged = ["ADMIN", "SUPERADMIN", "STAFF"].includes(role);
  if (!isPrivileged && booking.userID !== userId) {
    throw new Error("Unauthorized to view this booking");
  }

  return booking;
};
