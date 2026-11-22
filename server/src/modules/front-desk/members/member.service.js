import prisma from "../../../config/prisma.js";

/**
 * Entitlement configurations per membership tier based on PRD:
 * - Gold (premium, full access): 20% court discount, 30% shop discount, 20% bar discount, priority access.
 * - Silver (standard): 10% court discount, 15% shop discount, 10% bar discount.
 * - Junior (under 18, discounted): 15% court discount, 11% shop discount, 15% bar discount.
 */
export const TIER_ENTITLEMENTS = {
  GOLD: {
    tier: "GOLD",
    displayName: "Gold Member (Premium, Full Access)",
    courtDiscountPercent: 20,
    shopDiscountPercent: 30,
    cafeDiscountPercent: 20,
    dailyBookingLimit: 2,
    courtPrivileges: "Full Access & Priority Booking across Tennis, Cricket, Badminton & Padel",
    shopPrivileges: "30% off all apparel, rackets, balls, and gear",
    cafePrivileges: "20% off food and beverages + tab settlement privilege",
  },
  SILVER: {
    tier: "SILVER",
    displayName: "Silver Member (Standard)",
    courtDiscountPercent: 10,
    shopDiscountPercent: 15,
    cafeDiscountPercent: 10,
    dailyBookingLimit: 2,
    courtPrivileges: "Standard booking across all courts",
    shopPrivileges: "15% off gear & equipment",
    cafePrivileges: "10% off cafe & bar orders",
  },
  JUNIOR: {
    tier: "JUNIOR",
    displayName: "Junior Member (Under 18, Discounted)",
    courtDiscountPercent: 15,
    shopDiscountPercent: 11,
    cafeDiscountPercent: 15,
    dailyBookingLimit: 2,
    courtPrivileges: "Discounted youth court booking",
    shopPrivileges: "11% off junior gear & accessories",
    cafePrivileges: "15% off youth cafe menu",
  },
  NONE: {
    tier: "WALKIN",
    displayName: "Walk-in Guest",
    courtDiscountPercent: 0,
    shopDiscountPercent: 0,
    cafeDiscountPercent: 0,
    dailyBookingLimit: 2,
    courtPrivileges: "Standard public walk-in court rate",
    shopPrivileges: "Standard retail prices",
    cafePrivileges: "Standard menu prices (no discount)",
  },
};

/**
 * Calculates membership status, days until renewal, and validity.
 */
export const calculateMembershipStatus = (user) => {
  if (!user.renewalDate) {
    return {
      status: "ACTIVE",
      daysUntilExpiry: null,
      isExpired: false,
    };
  }

  const now = new Date();
  const renewal = new Date(user.renewalDate);
  const diffMs = renewal.getTime() - now.getTime();
  const daysUntilExpiry = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  const isExpired = daysUntilExpiry <= 0;

  let status = "ACTIVE";
  if (isExpired) {
    status = "EXPIRED";
  } else if (daysUntilExpiry <= 7) {
    status = "EXPIRING_SOON";
  }

  return {
    status,
    daysUntilExpiry: Math.max(0, daysUntilExpiry),
    isExpired,
  };
};

/**
 * Search members rapidly by name, phone, or email so front-desk staff can recognize them instantly.
 *
 * @param {string} query - Search term (name, phone, or email)
 * @param {number} [limit=10]
 * @returns {Promise<Array>} List of matched member summaries
 */
export const searchMembers = async (query, limit = 10) => {
  const term = (query || "").trim();
  const where = term
    ? {
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { phone: { contains: term, mode: "insensitive" } },
          { email: { contains: term, mode: "insensitive" } },
        ],
      }
    : {};

  const users = await prisma.user.findMany({
    where,
    take: parseInt(limit, 10) || 10,
    orderBy: { lastEntry: "desc" },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      membership: true,
      renewalDate: true,
      lastEntry: true,
      amount: true,
    },
  });

  return users.map((u) => {
    const statusInfo = calculateMembershipStatus(u);
    const entitlements = TIER_ENTITLEMENTS[u.membership] || TIER_ENTITLEMENTS.NONE;

    return {
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      role: u.role,
      membership: u.membership,
      walletBalance: Number(u.amount),
      lastEntry: u.lastEntry,
      ...statusInfo,
      entitlementsSummary: {
        courtDiscount: `${entitlements.courtDiscountPercent}%`,
        shopDiscount: `${entitlements.shopDiscountPercent}%`,
        cafeDiscount: `${entitlements.cafeDiscountPercent}%`,
      },
    };
  });
};

/**
 * Retrieves the full 360-degree profile and history for a member.
 * Returns:
 * - Profile details (excluding password)
 * - Active plan entitlements & discounts
 * - Lifetime activity & spending summary
 * - Sports court bookings history
 * - Sports gear shop purchases & order items
 * - Cafe & Bar orders
 *
 * @param {string} identifier - User ID or phone number
 * @param {boolean} [byPhone=false]
 * @returns {Promise<Object>} Full Member 360 Object
 */
export const getMember360 = async (identifier, byPhone = false) => {
  if (!identifier) {
    throw new Error("Member ID or phone number is required");
  }

  const where = byPhone ? { phone: identifier.trim() } : { id: identifier.trim() };

  const user = await prisma.user.findUnique({
    where,
    include: {
      sportsBookings: {
        orderBy: { slot: "desc" },
        take: 30,
      },
      shopPurchases: {
        orderBy: { purchaseDate: "desc" },
        take: 30,
        include: {
          orderItems: {
            include: {
              product: {
                select: { id: true, name: true, category: true },
              },
            },
          },
        },
      },
      cafeOrders: {
        orderBy: { dateTime: "desc" },
        take: 30,
      },
    },
  });

  if (!user) {
    const error = new Error(`Member not found with identifier '${identifier}'`);
    error.statusCode = 404;
    throw error;
  }

  const statusInfo = calculateMembershipStatus(user);
  const entitlements = TIER_ENTITLEMENTS[user.membership] || TIER_ENTITLEMENTS.NONE;

  // Calculate lifetime financial & engagement stats
  const totalBookingsCount = user.sportsBookings.length;
  const confirmedBookingsCount = user.sportsBookings.filter((b) => b.status === "CONFIRMED").length;
  const totalBookingsSpent = user.sportsBookings
    .filter((b) => b.status === "CONFIRMED")
    .reduce((sum, b) => sum + Number(b.totalAmount), 0);

  const totalShopPurchasesCount = user.shopPurchases.length;
  const totalShopSpent = user.shopPurchases
    .filter((p) => p.status !== "CANCELLED")
    .reduce((sum, p) => sum + Number(p.totalAmount), 0);

  const totalCafeOrdersCount = user.cafeOrders.length;
  const totalCafeSpent = user.cafeOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

  const totalLifetimeSpent = Math.round((totalBookingsSpent + totalShopSpent + totalCafeSpent) * 100) / 100;

  return {
    profile: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      membership: user.membership,
      pastMembership: user.pastMembership || [],
      walletBalance: Number(user.amount),
      renewalDate: user.renewalDate,
      lastReminderSent: user.lastReminderSent,
      lastEntry: user.lastEntry,
      ...statusInfo,
    },
    entitlements,
    summary: {
      totalLifetimeSpent,
      totalBookingsCount,
      confirmedBookingsCount,
      totalBookingsSpent: Math.round(totalBookingsSpent * 100) / 100,
      totalShopPurchasesCount,
      totalShopSpent: Math.round(totalShopSpent * 100) / 100,
      totalCafeOrdersCount,
      totalCafeSpent: Math.round(totalCafeSpent * 100) / 100,
    },
    history: {
      sportsBookings: user.sportsBookings.map((b) => ({
        id: b.id,
        sport: b.whichCourt,
        slot: b.slot,
        endTime: b.endTime,
        playerCount: b.playerCount,
        basePrice: Number(b.basePrice),
        discountPercentage: Number(b.discountPercentage),
        totalAmount: Number(b.totalAmount),
        status: b.status,
        createdAt: b.createdAt,
      })),
      shopPurchases: user.shopPurchases.map((p) => ({
        id: p.id,
        purchaseDate: p.purchaseDate,
        totalAmount: Number(p.totalAmount),
        discount: Number(p.discount),
        status: p.status,
        fulfillmentType: p.fulfillmentType,
        items: p.items,
        orderItems: p.orderItems.map((item) => ({
          id: item.id,
          productName: item.product?.name || "Product",
          category: item.product?.category,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        })),
      })),
      cafeOrders: user.cafeOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        tableNumber: o.tableNumber,
        dateTime: o.dateTime,
        orderItems: o.orderItems,
        totalAmount: Number(o.totalAmount),
      })),
    },
  };
};

/**
 * Records a member check-in timestamp upon arrival at front-desk.
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>}
 */
export const recordMemberCheckIn = async (userId) => {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { lastEntry: new Date() },
    select: {
      id: true,
      name: true,
      membership: true,
      lastEntry: true,
      amount: true,
    },
  });

  return {
    message: `Welcome to The Champions Club, ${updated.name}! Check-in recorded.`,
    user: updated,
  };
};
