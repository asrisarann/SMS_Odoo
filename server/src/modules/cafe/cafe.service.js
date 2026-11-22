import prisma from "../../config/prisma.js";

const DEFAULT_MENU_ITEMS = [
  {
    name: "Electrolyte Recovery Smoothie",
    description: "Coconut water, potassium-rich banana, berries, pink salt, and organic chia seeds for post-match rehydration.",
    category: "SMOOTHIES",
    price: 180,
    calories: 220,
    prepTimeMin: 5,
    isVegan: true,
    isGlutenFree: true,
  },
  {
    name: "Whey Protein Muscle Shake",
    description: "Cold-filtered whey isolate (30g protein), unsweetened almond milk, dark cacao, and peanut butter.",
    category: "PROTEIN",
    price: 240,
    calories: 310,
    prepTimeMin: 5,
    isVegan: false,
    isGlutenFree: true,
  },
  {
    name: "Cold Pressed Detox Green Juice",
    description: "Crisp cucumber, green apple, organic celery, kale, lemon, and fresh ginger root.",
    category: "BEVERAGES",
    price: 190,
    calories: 140,
    prepTimeMin: 4,
    isVegan: true,
    isGlutenFree: true,
  },
  {
    name: "Artisan Grilled Chicken Panini",
    description: "Herb-marinated chicken breast, fresh mozzarella, sun-dried tomatoes, and basil pesto on multigrain ciabatta.",
    category: "FOOD",
    price: 260,
    calories: 480,
    prepTimeMin: 10,
    isVegan: false,
    isGlutenFree: false,
  },
  {
    name: "Organic Acai Energy Bowl",
    description: "Pure Amazonian acai blend topped with gluten-free granola, blueberries, kiwi slices, and toasted coconut flakes.",
    category: "FOOD",
    price: 320,
    calories: 340,
    prepTimeMin: 6,
    isVegan: true,
    isGlutenFree: true,
  },
  {
    name: "Mediterranean Falafel Wrap",
    description: "Spiced baked chickpeas, crisp romaine lettuce, Persian cucumbers, and tahini drizzle in whole wheat pita.",
    category: "FOOD",
    price: 220,
    calories: 410,
    prepTimeMin: 8,
    isVegan: true,
    isGlutenFree: false,
  },
  {
    name: "High-Protein Paneer Power Bowl",
    description: "Char-grilled low-fat paneer, warm quinoa, roasted bell peppers, steamed broccoli, and lemon vinaigrette.",
    category: "FOOD",
    price: 280,
    calories: 450,
    prepTimeMin: 9,
    isVegan: false,
    isGlutenFree: true,
  },
  {
    name: "Double Shot Matchday Espresso",
    description: "Single-origin Arabica roast pulled with rich crema for sustained focus and match intensity.",
    category: "COFFEE",
    price: 120,
    calories: 15,
    prepTimeMin: 3,
    isVegan: true,
    isGlutenFree: true,
  },
  {
    name: "Iced Caramel Oat Milk Macchiato",
    description: "Chilled espresso, creamy barista oat milk, and sugar-free organic vanilla-caramel syrup.",
    category: "COFFEE",
    price: 180,
    calories: 190,
    prepTimeMin: 4,
    isVegan: true,
    isGlutenFree: true,
  },
  {
    name: "Pure Tender Coconut Water",
    description: "Freshly tapped natural coastal tender coconut packed with electrolytes and minerals.",
    category: "BEVERAGES",
    price: 90,
    calories: 60,
    prepTimeMin: 2,
    isVegan: true,
    isGlutenFree: true,
  },
  {
    name: "Raw Almonds & Berry Trail Mix",
    description: "Oven-roasted California almonds, pumpkin seeds, dried cranberries, and 85% dark chocolate chips.",
    category: "SNACKS",
    price: 110,
    calories: 210,
    prepTimeMin: 1,
    isVegan: true,
    isGlutenFree: true,
  },
  {
    name: "Dark Chocolate Protein Crunch Bar",
    description: "20g whey & soy crisp bar coated in Belgian dark chocolate with zero added refined sugars.",
    category: "SNACKS",
    price: 140,
    calories: 250,
    prepTimeMin: 1,
    isVegan: false,
    isGlutenFree: true,
  },
];

/**
 * Seed initial cafe menu items if table is empty.
 */
export const seedInitialMenuIfEmpty = async () => {
  const count = await prisma.cafeMenuItem.count();
  if (count === 0) {
    for (const item of DEFAULT_MENU_ITEMS) {
      await prisma.cafeMenuItem.create({
        data: item,
      });
    }
  }
};

/**
 * Fetch list of cafe menu items with optional category and search filters.
 */
export const getMenuItems = async ({ category, search, availableOnly = false } = {}) => {
  await seedInitialMenuIfEmpty();

  const where = {};
  if (category && category !== "ALL") {
    where.category = category.toUpperCase();
  }
  if (availableOnly) {
    where.isAvailable = true;
  }
  if (search && search.trim()) {
    where.name = {
      contains: search.trim(),
      mode: "insensitive",
    };
  }

  return await prisma.cafeMenuItem.findMany({
    where,
    orderBy: [{ category: "asc" }, { price: "asc" }],
  });
};

/**
 * Toggle menu item availability (In Stock / Sold Out).
 */
export const toggleMenuItemAvailability = async (id) => {
  const item = await prisma.cafeMenuItem.findUnique({
    where: { id },
  });
  if (!item) {
    const error = new Error(`Menu item '${id}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  return await prisma.cafeMenuItem.update({
    where: { id },
    data: {
      isAvailable: !item.isAvailable,
    },
  });
};

/**
 * Create a new Court-Side Bar / Cafeteria order.
 * Calculates membership tier discounts (Gold 20%, Silver 10%, Junior 5%),
 * handles Virtual Card cardless payment with balance checks,
 * and records order item details atomically.
 */
export const createCafeOrder = async ({
  userId,
  items, // array of { menuItemId, quantity }
  deliveryLocation = "BAR_LOUNGE", // "BAR_LOUNGE", "COURT_SIDE", "TAKEAWAY"
  tableNumber = null,
  courtNumber = null,
  notes = null,
  paymentMethod = "VIRTUAL_CARD",
}) => {
  if (!userId) {
    const error = new Error("User ID is required to place an order.");
    error.statusCode = 400;
    throw error;
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    const error = new Error("Order must contain at least one menu item.");
    error.statusCode = 400;
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      membership: true,
      amount: true,
    },
  });

  if (!user) {
    const error = new Error(`User with ID '${userId}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  // Fetch all referenced menu items
  const menuItemIds = items.map((i) => i.menuItemId).filter(Boolean);
  const dbMenuItems = await prisma.cafeMenuItem.findMany({
    where: { id: { in: menuItemIds } },
  });

  const menuMap = new Map(dbMenuItems.map((m) => [m.id, m]));

  // Calculate items and subtotal
  let subtotal = 0;
  const orderItemDetails = [];
  const textSummaryItems = [];

  for (const requestedItem of items) {
    const menuItem = menuMap.get(requestedItem.menuItemId);
    if (!menuItem) {
      const error = new Error(`Menu item '${requestedItem.menuItemId}' not found.`);
      error.statusCode = 400;
      throw error;
    }

    if (!menuItem.isAvailable) {
      const error = new Error(`'${menuItem.name}' is currently sold out.`);
      error.statusCode = 400;
      throw error;
    }

    const qty = Math.max(1, parseInt(requestedItem.quantity, 10) || 1);
    const unitPrice = Number(menuItem.price);
    const totalPrice = unitPrice * qty;

    subtotal += totalPrice;

    orderItemDetails.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      category: menuItem.category,
      quantity: qty,
      unitPrice,
      totalPrice,
    });

    textSummaryItems.push(`${menuItem.name} x ${qty}`);
  }

  // Calculate tier discount percentage (Gold 20%, Silver 10%, Junior 5%)
  let discountPercent = 0;
  if (user.membership === "GOLD") {
    discountPercent = 20;
  } else if (user.membership === "SILVER") {
    discountPercent = 10;
  } else if (user.membership === "JUNIOR") {
    discountPercent = 5;
  }

  const discountAmount = Math.round(((subtotal * discountPercent) / 100) * 100) / 100;
  const totalAmount = Math.max(0, subtotal - discountAmount);

  // Check virtual card balance if chosen
  const currentBalance = Number(user.amount);
  if (paymentMethod === "VIRTUAL_CARD" && currentBalance < totalAmount) {
    const error = new Error(
      `Insufficient wallet balance (₹${currentBalance.toFixed(2)}). Order total is ₹${totalAmount.toFixed(2)}. Please top up your wallet.`
    );
    error.statusCode = 400;
    throw error;
  }

  const dateSuffix = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `CAFE-${dateSuffix}-${randomSuffix}`;

  const createdOrder = await prisma.$transaction(async (tx) => {
    let balanceAfter = currentBalance;

    if (paymentMethod === "VIRTUAL_CARD") {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          amount: { decrement: totalAmount },
        },
      });
      balanceAfter = Number(updatedUser.amount);

      await tx.walletTransaction.create({
        data: {
          userID: user.id,
          phone: user.phone,
          type: "DEBIT",
          amount: totalAmount,
          balanceAfter,
          paymentMethod: "VIRTUAL_CARD",
          module: "CAFE",
          description: `Court-Side Bar Order #${orderNumber} (${textSummaryItems.join(", ")})`,
        },
      });
    }

    const order = await tx.cafeOrder.create({
      data: {
        userID: user.id,
        orderNumber,
        tableNumber: tableNumber ? parseInt(tableNumber, 10) : null,
        courtNumber: courtNumber || null,
        deliveryLocation,
        status: "RECEIVED",
        orderItems: textSummaryItems,
        subtotal,
        discount: discountAmount,
        totalAmount,
        paymentMethod,
        paymentStatus: "PAID",
        notes: notes || null,
        items: {
          create: orderItemDetails.map((item) => ({
            menuItemId: item.menuItemId,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
      },
      include: {
        items: true,
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            membership: true,
          },
        },
      },
    });

    return { order, balanceAfter };
  });

  return {
    success: true,
    message: `Order #${orderNumber} placed successfully!`,
    order: createdOrder.order,
    walletBalance: createdOrder.balanceAfter,
  };
};

/**
 * Get all cafe/bar orders for kitchen display system and staff ledger.
 */
export const getCafeOrders = async ({
  status = "ALL",
  deliveryLocation = "ALL",
  limit = 50,
  page = 1,
} = {}) => {
  const where = {};
  if (status && status !== "ALL") {
    where.status = status.toUpperCase();
  }
  if (deliveryLocation && deliveryLocation !== "ALL") {
    where.deliveryLocation = deliveryLocation.toUpperCase();
  }

  const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (Math.max(1, parseInt(page, 10) || 1) - 1) * take;

  const [total, orders] = await Promise.all([
    prisma.cafeOrder.count({ where }),
    prisma.cafeOrder.findMany({
      where,
      include: {
        items: true,
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            membership: true,
          },
        },
      },
      orderBy: { dateTime: "desc" },
      take,
      skip,
    }),
  ]);

  return {
    total,
    page: parseInt(page, 10) || 1,
    limit: take,
    orders,
  };
};

/**
 * Get personal order history for a specific logged-in member.
 */
export const getUserCafeOrders = async (userId) => {
  return await prisma.cafeOrder.findMany({
    where: { userID: userId },
    include: {
      items: true,
    },
    orderBy: { dateTime: "desc" },
  });
};

/**
 * Update cafe order status in the Kitchen Display System (KDS).
 * Transitions: RECEIVED -> PREPARING -> READY -> SERVED (or CANCELLED).
 */
export const updateCafeOrderStatus = async (orderId, newStatus, notes = null) => {
  const normStatus = (newStatus || "").toUpperCase();
  const validStatuses = ["RECEIVED", "PREPARING", "READY", "SERVED", "CANCELLED"];

  if (!validStatuses.includes(normStatus)) {
    const error = new Error(`Invalid status '${newStatus}'. Allowed: ${validStatuses.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  const order = await prisma.cafeOrder.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    const error = new Error(`Order with ID '${orderId}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  const updateData = {
    status: normStatus,
  };

  if (notes) {
    updateData.notes = notes;
  }

  if (normStatus === "SERVED") {
    updateData.fulfilledAt = new Date();
  }

  return await prisma.cafeOrder.update({
    where: { id: orderId },
    data: updateData,
    include: {
      items: true,
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          membership: true,
        },
      },
    },
  });
};

/**
 * Bar & Lounge executive stats (today's revenue, active tickets, popular items).
 */
export const getBarStats = async () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [todayAgg, allCount, activeCount, readyCount, servedCount] = await Promise.all([
    prisma.cafeOrder.aggregate({
      where: { dateTime: { gte: startOfDay } },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    prisma.cafeOrder.count(),
    prisma.cafeOrder.count({ where: { status: { in: ["RECEIVED", "PREPARING"] } } }),
    prisma.cafeOrder.count({ where: { status: "READY" } }),
    prisma.cafeOrder.count({ where: { status: "SERVED" } }),
  ]);

  return {
    todayRevenue: Number(todayAgg._sum.totalAmount || 0),
    todayOrders: todayAgg._count.id || 0,
    totalOrders: allCount,
    activeTickets: activeCount,
    readyForDelivery: readyCount,
    servedTickets: servedCount,
  };
};
