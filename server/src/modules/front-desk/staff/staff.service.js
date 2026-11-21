import prisma from "../../../config/prisma.js";

/**
 * Retrieves daily activities for the front desk:
 * - Today's member check-ins (from User.lastEntry)
 * - Today's incoming calls (from CallLog.callTime and callType = INCOMING)
 * - Today's outgoing calls (from CallLog.callTime and callType = OUTGOING)
 * - Consolidated summary: totalCheckIns, totalIncomingCalls, totalOutgoingCalls, totalActivities
 *
 * Uses Promise.all to execute independent database queries in parallel.
 *
 * @param {string} [customDate] - Optional specific date in YYYY-MM-DD format
 * @returns {Promise<Object>} Consolidated summary and activity lists
 */
export const getDailyActivities = async (customDate) => {
  let startOfDay;
  let endOfDay;

  if (customDate && /^\d{4}-\d{2}-\d{2}$/.test(String(customDate).trim())) {
    const dateStr = String(customDate).trim();
    startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
  } else {
    const now = new Date();
    startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }

  // Execute independent Prisma queries in parallel using Promise.all
  const [checkIns, incomingCalls, outgoingCalls] = await Promise.all([
    // A. Today's member check-ins (from User.lastEntry)
    prisma.user.findMany({
      where: {
        lastEntry: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        membership: true,
        lastEntry: true,
      },
      orderBy: {
        lastEntry: "desc",
      },
    }),

    // B. Today's incoming calls (from CallLog.callTime and callType = INCOMING)
    prisma.callLog.findMany({
      where: {
        callType: "INCOMING",
        callTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        id: true,
        callerName: true,
        phone: true,
        callType: true,
        purpose: true,
        notes: true,
        callTime: true,
      },
      orderBy: {
        callTime: "desc",
      },
    }),

    // C. Today's outgoing calls (from CallLog.callTime and callType = OUTGOING)
    prisma.callLog.findMany({
      where: {
        callType: "OUTGOING",
        callTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        id: true,
        callerName: true,
        phone: true,
        callType: true,
        purpose: true,
        notes: true,
        callTime: true,
      },
      orderBy: {
        callTime: "desc",
      },
    }),
  ]);

  const totalCheckIns = checkIns.length;
  const totalIncomingCalls = incomingCalls.length;
  const totalOutgoingCalls = outgoingCalls.length;
  const totalActivities = totalCheckIns + totalIncomingCalls + totalOutgoingCalls;

  return {
    summary: {
      totalCheckIns,
      totalIncomingCalls,
      totalOutgoingCalls,
      totalActivities,
    },
    activities: {
      checkIns,
      incomingCalls,
      outgoingCalls,
    },
  };
};
