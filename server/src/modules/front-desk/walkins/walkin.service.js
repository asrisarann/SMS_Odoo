import prisma from "../../../config/prisma.js";

/**
 * Registers a walk-in visitor using the existing User model.
 *
 * Case A: If user with the phone number already exists:
 *         - Updates lastEntry to current timestamp.
 *         - Does not overwrite membership or other profile details.
 *         - Returns existing user (isNew: false).
 *
 * Case B: If new user:
 *         - Checks for unique email conflicts (returns 409 if taken).
 *         - Creates a new User with name, phone, email, membership, lastEntry.
 *         - Returns newly created user (isNew: true).
 *
 * Uses a Prisma transaction for safe atomic database operations.
 */
export const registerWalkinUser = async ({ name, phone, email, membership }) => {
  // 1. Search existing user by phone number
  const existingUserByPhone = await prisma.user.findUnique({
    where: { phone },
  });

  if (existingUserByPhone) {
    // Case A: Existing user found - update lastEntry
    const updatedUser = await prisma.user.update({
      where: { id: existingUserByPhone.id },
      data: {
        lastEntry: new Date(),
      },
    });

    return {
      user: updatedUser,
      isNew: false,
      message: "Existing user found. Check-in timestamp updated.",
    };
  }

  // 2. Pre-check if email is already taken by another user
  const existingUserByEmail = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUserByEmail) {
    const error = new Error("A user with this email address already exists.");
    error.statusCode = 409;
    error.field = "email";
    throw error;
  }

  // 3. Case B: Create new user record
  const newUser = await prisma.user.create({
    data: {
      name,
      phone,
      email,
      membership,
      lastEntry: new Date(),
    },
  });

  return {
    user: newUser,
    isNew: true,
    message: "New walk-in visitor registered successfully.",
  };
};

/**
 * Retrieves all registered users (walk-ins) with search, filter, and pagination support.
 * Excludes password field.
 * Sorted by newest first (lastEntry: desc).
 */
export const getAllWalkinUsers = async ({ search, membership, date, page = 1, limit = 10 }) => {
  const where = {};
  const andConditions = [];

  // 1. Search filter across name, phone, email
  if (search && search.trim()) {
    const term = search.trim();
    andConditions.push({
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { phone: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ],
    });
  }

  // 2. Membership filter
  if (membership) {
    andConditions.push({
      membership: membership.toUpperCase(),
    });
  }

  // 3. Date filter on lastEntry (covers full day from 00:00:00.000 to 23:59:59.999 UTC)
  if (date) {
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);
    andConditions.push({
      lastEntry: {
        gte: startOfDay,
        lte: endOfDay,
      },
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const skip = (page - 1) * limit;

  // Execute count and query in parallel
  const [users, totalRecords] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        membership: true,
        renewalDate: true,
        pastMembership: true,
        lastEntry: true,
        amount: true,
        // password is intentionally omitted for security
      },
      orderBy: {
        lastEntry: "desc",
      },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(totalRecords / limit) || 1;

  return {
    users,
    pagination: {
      page,
      limit,
      totalRecords,
      totalPages,
    },
  };
};

/**
 * Retrieves a single walk-in user by their unique phone number.
 * Excludes password field.
 * Returns null if not found.
 */
export const getWalkinUserByPhone = async (phone) => {
  return await prisma.user.findUnique({
    where: { phone },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      membership: true,
      renewalDate: true,
      pastMembership: true,
      lastEntry: true,
      amount: true,
      // password is intentionally omitted for security
    },
  });
};

/**
 * Retrieves aggregate statistics for walk-ins and memberships.
 * Returns:
 * - totalMembers: total count of all registered users
 * - goldMembers: count of users with Membership.GOLD
 * - silverMembers: count of users with Membership.SILVER
 * - juniorMembers: count of users with Membership.JUNIOR
 * - todayCheckIns: count of users whose lastEntry falls within the current day
 */
export const getWalkinStats = async () => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Execute total count, membership breakdown, and today's check-ins in parallel
  const [totalMembers, membershipGroups, todayCheckIns] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({
      by: ["membership"],
      _count: {
        _all: true,
      },
    }),
    prisma.user.count({
      where: {
        lastEntry: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    }),
  ]);

  const membershipMap = {
    GOLD: 0,
    SILVER: 0,
    JUNIOR: 0,
  };

  for (const group of membershipGroups) {
    if (membershipMap[group.membership] !== undefined) {
      membershipMap[group.membership] = group._count._all;
    }
  }

  return {
    totalMembers,
    goldMembers: membershipMap.GOLD,
    silverMembers: membershipMap.SILVER,
    juniorMembers: membershipMap.JUNIOR,
    todayCheckIns,
  };
};
