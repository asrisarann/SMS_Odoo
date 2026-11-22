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

/**
 * Get single order by ID with ownership/role permission check.
 */
export const getOrderById = async (orderId, userId = null, role = null) => {
  const order = await prisma.cafeOrder.findUnique({
    where: { id: orderId },
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

  if (!order) {
    const error = new Error(`Order with ID '${orderId}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  // If user is a member, they can only view their own order
  if (role === "MEMBER" && userId && order.userID !== userId) {
    const error = new Error("You cannot access another customer's order.");
    error.statusCode = 403;
    throw error;
  }

  return order;
};

/**
 * Get structured receipt JSON for an order matching FastAPI ReceiptResponse.
 */
export const getOrderReceipt = async (orderId, userId = null, role = null) => {
  const order = await getOrderById(orderId, userId, role);

  return {
    receipt_id: order.id,
    order_id: order.id,
    order_number: order.orderNumber,
    customer_id: order.userID,
    customer_name: order.user?.name || "Club Member",
    customer_email: order.user?.email || "",
    customer_phone: order.user?.phone || "",
    order_datetime: order.dateTime,
    table_number: order.tableNumber,
    court_number: order.courtNumber,
    delivery_location: order.deliveryLocation,
    items: order.orderItems || [],
    detailed_items: order.items || [],
    subtotal: Number(order.subtotal || order.totalAmount),
    discount_amount: Number(order.discount || 0),
    total_amount: Number(order.totalAmount),
    payment_method: order.paymentMethod,
    status: order.status,
    notes: order.notes,
    generated_at: new Date(),
  };
};

/**
 * Generate a valid standard PDF/1.4 buffer for the order receipt.
 */
export const generateReceiptPdfBuffer = (receipt) => {
  const sanitize = (str) =>
    (str || "").toString().replace(/[\\()]/g, "\\$&");

  const lines = [];
  lines.push("%PDF-1.4");
  lines.push("1 0 obj");
  lines.push("<< /Type /Catalog /Pages 2 0 R >>");
  lines.push("endobj");
  lines.push("2 0 obj");
  lines.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  lines.push("endobj");
  lines.push("3 0 obj");
  lines.push(
    "<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /MediaBox [0 0 595 842] /Contents 6 0 R >>"
  );
  lines.push("endobj");
  lines.push("4 0 obj");
  lines.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  lines.push("endobj");
  lines.push("5 0 obj");
  lines.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  lines.push("endobj");

  // Build stream content
  let content = "";
  // Header Title
  content += "BT\n/F1 18 Tf\n50 780 Td\n(Champions Club Cafe & Bar) Tj\nET\n";
  content += "BT\n/F2 12 Tf\n50 760 Td\n(Official Order Receipt) Tj\nET\n";

  // Order Details
  content += "BT\n/F2 10 Tf\n50 730 Td\n";
  content += `(Order Number: ${sanitize(receipt.order_number)}) Tj\n`;
  content += "0 -15 Td\n";
  content += `(Date & Time: ${sanitize(new Date(receipt.order_datetime).toLocaleString())}) Tj\n`;
  content += "0 -15 Td\n";
  content += `(Customer: ${sanitize(receipt.customer_name)} <${sanitize(receipt.customer_email)}>) Tj\n`;
  content += "0 -15 Td\n";
  content += `(Destination: ${sanitize(receipt.court_number || (receipt.table_number ? `Table #${receipt.table_number}` : "Takeaway"))}) Tj\n`;
  content += "0 -15 Td\n";
  content += `(Payment Method: ${sanitize(receipt.payment_method)}) Tj\n`;
  content += "ET\n";

  // Line separator
  content += "50 645 m 545 645 l S\n";

  // Table Header
  content += "BT\n/F1 10 Tf\n50 630 Td\n(Item Description) Tj\n350 0 Td\n(Qty) Tj\n60 0 Td\n(Amount) Tj\nET\n";
  content += "50 620 m 545 620 l S\n";

  // Items list
  let y = 600;
  const items = receipt.detailed_items?.length
    ? receipt.detailed_items
    : (receipt.items || []).map((desc) => ({ name: desc, quantity: 1, totalPrice: 0 }));

  for (const item of items) {
    content += "BT\n/F2 10 Tf\n";
    content += `50 ${y} Td\n`;
    content += `(${sanitize(item.name)}) Tj\n`;
    content += `350 0 Td\n`;
    content += `(${sanitize(item.quantity || 1)}) Tj\n`;
    content += `60 0 Td\n`;
    content += `(INR ${sanitize((item.totalPrice || 0).toFixed(2))}) Tj\n`;
    content += "ET\n";
    y -= 18;
  }

  y -= 10;
  content += `50 ${y} m 545 ${y} l S\n`;
  y -= 20;

  // Subtotal & Discounts
  content += "BT\n/F2 10 Tf\n";
  content += `350 ${y} Td\n`;
  content += `(Subtotal: INR ${(receipt.subtotal || 0).toFixed(2)}) Tj\n`;
  content += "0 -15 Td\n";
  content += `(Discount: - INR ${(receipt.discount_amount || 0).toFixed(2)}) Tj\n`;
  content += "/F1 12 Tf\n";
  content += "0 -20 Td\n";
  content += `(Total Paid: INR ${(receipt.total_amount || 0).toFixed(2)}) Tj\n`;
  content += "ET\n";

  // Footer
  content += "BT\n/F2 10 Tf\n150 100 Td\n(Thank you for visiting Champions Club Cafe & Bar!) Tj\nET\n";

  const streamBuffer = Buffer.from(content, "utf-8");
  lines.push("6 0 obj");
  lines.push(`<< /Length ${streamBuffer.length} >>`);
  lines.push("stream");

  const headerPart = Buffer.from(lines.join("\n") + "\n", "utf-8");
  const footerLines = [];
  footerLines.push("\nendstream");
  footerLines.push("endobj");

  const offsets = [0];
  offsets.push(headerPart.indexOf("1 0 obj"));
  offsets.push(headerPart.indexOf("2 0 obj"));
  offsets.push(headerPart.indexOf("3 0 obj"));
  offsets.push(headerPart.indexOf("4 0 obj"));
  offsets.push(headerPart.indexOf("5 0 obj"));
  offsets.push(headerPart.indexOf("6 0 obj"));

  const footerBuffer = Buffer.from(footerLines.join("\n") + "\n", "utf-8");
  const fullContentLength = headerPart.length + streamBuffer.length + footerBuffer.length;

  const xrefLines = [];
  xrefLines.push("xref");
  xrefLines.push("0 7");
  xrefLines.push("0000000000 65535 f ");
  for (let i = 1; i <= 6; i++) {
    xrefLines.push(String(offsets[i]).padStart(10, "0") + " 00000 n ");
  }
  xrefLines.push("trailer");
  xrefLines.push("<< /Size 7 /Root 1 0 R >>");
  xrefLines.push("startxref");
  xrefLines.push(String(fullContentLength));
  xrefLines.push("%%EOF");

  const xrefBuffer = Buffer.from(xrefLines.join("\n") + "\n", "utf-8");

  return Buffer.concat([headerPart, streamBuffer, footerBuffer, xrefBuffer]);
};

/**
 * Order sales summary with date range filtering matching FastAPI AdminOrderSummary.
 */
export const getOrderSummary = async ({ startDate = null, endDate = null } = {}) => {
  const where = {};
  if (startDate || endDate) {
    where.dateTime = {};
    if (startDate) {
      where.dateTime.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.dateTime.lte = end;
    }
  }

  const [allCount, allSum, allAvg, rangeCount] = await Promise.all([
    prisma.cafeOrder.count(),
    prisma.cafeOrder.aggregate({
      _sum: { totalAmount: true },
    }),
    prisma.cafeOrder.aggregate({
      _avg: { totalAmount: true },
    }),
    prisma.cafeOrder.count({ where }),
  ]);

  const totalSales = Number(allSum._sum.totalAmount || 0);
  const avgOrderVal = Number(allAvg._avg.totalAmount || 0);

  return {
    total_orders: allCount,
    total_sales_amount: totalSales,
    average_order_value: Math.round(avgOrderVal * 100) / 100,
    orders_in_date_range: rangeCount,
    start_date: startDate,
    end_date: endDate,
  };
};

/**
 * Create a new menu item in database.
 */
export const createMenuItem = async (data) => {
  const { name, category, price, description, prepTimeMin, calories, isVegan, isGlutenFree } = data;

  if (!name || !category || price === undefined) {
    const error = new Error("Name, category, and price are required.");
    error.statusCode = 400;
    throw error;
  }

  const item = await prisma.cafeMenuItem.create({
    data: {
      name: name.trim(),
      category: category.trim().toUpperCase(),
      price: parseFloat(price),
      description: description?.trim() || null,
      prepTimeMin: prepTimeMin ? parseInt(prepTimeMin, 10) : 5,
      calories: calories ? parseInt(calories, 10) : null,
      isVegan: Boolean(isVegan),
      isGlutenFree: Boolean(isGlutenFree),
      isAvailable: true,
    },
  });

  return {
    ...item,
    price: Number(item.price),
    preparationTime: item.prepTimeMin,
  };
};

/**
 * Update an existing menu item in database.
 */
export const updateMenuItem = async (id, data) => {
  const existing = await prisma.cafeMenuItem.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error(`Menu item with ID '${id}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.category !== undefined) updateData.category = data.category.trim().toUpperCase();
  if (data.price !== undefined) updateData.price = parseFloat(data.price);
  if (data.description !== undefined) updateData.description = data.description?.trim() || null;
  if (data.prepTimeMin !== undefined) updateData.prepTimeMin = parseInt(data.prepTimeMin, 10);
  if (data.calories !== undefined) updateData.calories = parseInt(data.calories, 10);
  if (data.isVegan !== undefined) updateData.isVegan = Boolean(data.isVegan);
  if (data.isGlutenFree !== undefined) updateData.isGlutenFree = Boolean(data.isGlutenFree);
  if (data.isAvailable !== undefined) updateData.isAvailable = Boolean(data.isAvailable);

  const item = await prisma.cafeMenuItem.update({
    where: { id },
    data: updateData,
  });

  return {
    ...item,
    price: Number(item.price),
    preparationTime: item.prepTimeMin,
  };
};

/**
 * Delete (or soft-delete) menu item.
 */
export const deleteMenuItem = async (id) => {
  const existing = await prisma.cafeMenuItem.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error(`Menu item with ID '${id}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  const item = await prisma.cafeMenuItem.update({
    where: { id },
    data: { isAvailable: false },
  });

  return {
    ...item,
    price: Number(item.price),
    preparationTime: item.prepTimeMin,
  };
};

/**
 * Get customer by ID for cafe/bar customer endpoint.
 */
export const getCustomerById = async (customerId) => {
  const customer = await prisma.user.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      membership: true,
      renewalDate: true,
      amount: true,
    },
  });

  if (!customer) {
    const error = new Error(`Customer with ID '${customerId}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  return customer;
};
