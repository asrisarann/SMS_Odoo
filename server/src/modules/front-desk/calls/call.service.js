import prisma from "../../../config/prisma.js";

/**
 * Creates a new CallLog entry using the Prisma CallLog model.
 *
 * @param {Object} data
 * @param {string} data.callerName
 * @param {string} data.phone
 * @param {'INCOMING' | 'OUTGOING'} data.callType
 * @param {string} data.purpose
 * @param {string|null} [data.notes]
 * @returns {Promise<Object>} The created CallLog record
 */
export const createCallLog = async ({ callerName, phone, callType, purpose, notes }) => {
  return await prisma.callLog.create({
    data: {
      callerName,
      phone,
      callType,
      purpose,
      notes: notes || null,
    },
  });
};

/**
 * Retrieves all CallLog records with search, filter, and pagination support.
 *
 * Requirements:
 * - Ordered by callTime descending (newest calls first).
 * - search: matches callerName or phone number (case-insensitive).
 * - callType: filter by 'INCOMING' or 'OUTGOING'.
 * - date: filter by callTime matching a specific date (YYYY-MM-DD).
 * - page & limit: pagination parameters.
 *
 * @param {Object} query
 * @param {string} [query.search]
 * @param {'INCOMING' | 'OUTGOING'} [query.callType]
 * @param {string} [query.date]
 * @param {number} [query.page=1]
 * @param {number} [query.limit=10]
 * @returns {Promise<Object>} The call logs and pagination metadata
 */
export const getAllCallLogs = async ({ search, callType, date, page = 1, limit = 10 }) => {
  const where = {};
  const andConditions = [];

  // 1. Search by callerName or phone
  if (search && search.trim()) {
    const term = search.trim();
    andConditions.push({
      OR: [
        { callerName: { contains: term, mode: "insensitive" } },
        { phone: { contains: term, mode: "insensitive" } },
      ],
    });
  }

  // 2. Filter by callType (INCOMING or OUTGOING)
  if (callType) {
    andConditions.push({
      callType: callType.toUpperCase(),
    });
  }

  // 3. Filter by date on callTime (00:00:00.000 to 23:59:59.999 UTC)
  if (date) {
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);
    andConditions.push({
      callTime: {
        gte: startOfDay,
        lte: endOfDay,
      },
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const skip = (page - 1) * limit;

  // Execute query and total count in parallel
  const [callLogs, totalRecords] = await Promise.all([
    prisma.callLog.findMany({
      where,
      orderBy: {
        callTime: "desc",
      },
      skip,
      take: limit,
    }),
    prisma.callLog.count({ where }),
  ]);

  const totalPages = Math.ceil(totalRecords / limit) || 1;

  return {
    callLogs,
    pagination: {
      page,
      limit,
      totalRecords,
      totalPages,
    },
  };
};

/**
 * Retrieves a single CallLog record by its unique ID.
 *
 * @param {string} id - ID of the CallLog record
 * @returns {Promise<Object|null>} The call log record or null if not found
 */
export const getCallLogById = async (id) => {
  return await prisma.callLog.findUnique({
    where: { id },
  });
};
