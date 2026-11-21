import prisma from "../../../config/prisma.js";
import * as callService from "../calls/call.service.js";

/**
 * Retrieves member check-ins for the day (from User.lastEntry).
 *
 * @param {Date} startOfDay
 * @param {Date} endOfDay
 * @returns {Promise<Array>}
 */
export const getDailyMemberCheckIns = async (startOfDay, endOfDay) => {
  return await prisma.user.findMany({
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
  });
};

/**
 * Retrieves daily activities for the front desk:
 * - Today's member check-ins (from User.lastEntry)
 * - Today's incoming and outgoing calls (delegated to calls/call.service.js)
 * - Consolidated summary
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

  // Execute member check-ins and call retrieval in parallel (all call operations in call.service.js)
  const [checkIns, { incomingCalls, outgoingCalls }] = await Promise.all([
    getDailyMemberCheckIns(startOfDay, endOfDay),
    callService.getDailyCalls(startOfDay, endOfDay),
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
