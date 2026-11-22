import {
  getMenuItems,
  toggleMenuItemAvailability,
  createCafeOrder,
  getCafeOrders,
  getUserCafeOrders,
  updateCafeOrderStatus,
  getBarStats,
  getOrderById,
  getOrderReceipt,
  generateReceiptPdfBuffer,
  getOrderSummary,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getCustomerById,
} from "./cafe.service.js";

/**
 * GET /api/cafe/menu
 * Public or authenticated endpoint for menu browsing.
 */
export const getMenuItemsHandler = async (req, res) => {
  try {
    const { category, search, availableOnly } = req.query;
    const items = await getMenuItems({
      category,
      search,
      availableOnly: availableOnly === "true",
    });

    return res.status(200).json({
      success: true,
      count: items.length,
      menu: items,
    });
  } catch (error) {
    console.error("getMenuItemsHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve cafe menu items.",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/cafe/menu/:id/toggle
 * Staff/Admin endpoint to toggle in-stock / sold-out status.
 */
export const toggleMenuItemAvailabilityHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await toggleMenuItemAvailability(id);

    return res.status(200).json({
      success: true,
      message: `Menu item '${updated.name}' is now ${updated.isAvailable ? "Available" : "Sold Out"}.`,
      item: updated,
    });
  } catch (error) {
    console.error("toggleMenuItemAvailabilityHandler error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to toggle menu item availability.",
    });
  }
};

/**
 * POST /api/cafe/orders
 * Authenticated member creates a food & drink order with automatic tier discount and wallet debit.
 */
export const createCafeOrderHandler = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { items, deliveryLocation, tableNumber, courtNumber, notes, paymentMethod } = req.body;

    const result = await createCafeOrder({
      userId,
      items,
      deliveryLocation,
      tableNumber,
      courtNumber,
      notes,
      paymentMethod,
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error("createCafeOrderHandler error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to place cafe order.",
    });
  }
};

/**
 * GET /api/cafe/orders
 * Staff/Admin/Kitchen Display System to list tickets.
 */
export const getCafeOrdersHandler = async (req, res) => {
  try {
    const { status, deliveryLocation, limit, page } = req.query;
    const result = await getCafeOrders({ status, deliveryLocation, limit, page });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("getCafeOrdersHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve cafe orders.",
      error: error.message,
    });
  }
};

/**
 * GET /api/cafe/orders/mine
 * Logged-in member retrieves their personal bar/cafe order history.
 */
export const getUserCafeOrdersHandler = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const orders = await getUserCafeOrders(userId);

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("getUserCafeOrdersHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve personal cafe orders.",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/cafe/orders/:id/status
 * Staff/KDS updates ticket status (RECEIVED -> PREPARING -> READY -> SERVED).
 */
export const updateCafeOrderStatusHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required." });
    }

    const updated = await updateCafeOrderStatus(id, status, notes);

    return res.status(200).json({
      success: true,
      message: `Order #${updated.orderNumber} marked as ${updated.status}.`,
      order: updated,
    });
  } catch (error) {
    console.error("updateCafeOrderStatusHandler error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update order status.",
    });
  }
};

/**
 * GET /api/cafe/stats
 * Staff/Admin bar operations metrics.
 */
export const getBarStatsHandler = async (req, res) => {
  try {
    const stats = await getBarStats();

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("getBarStatsHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve bar stats.",
      error: error.message,
    });
  }
};

/**
 * GET /api/cafe/menu/:id
 * Get single menu item.
 */
export const getMenuItemByIdHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const items = await getMenuItems();
    const item = items.find((i) => i.id === id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Menu item not found." });
    }
    return res.status(200).json({ success: true, item });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/cafe/menu
 * Create a new menu item.
 */
export const createMenuItemHandler = async (req, res) => {
  try {
    const item = await createMenuItem(req.body);
    return res.status(201).json({ success: true, item });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/cafe/menu/:id
 * Update an existing menu item.
 */
export const updateMenuItemHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await updateMenuItem(id, req.body);
    return res.status(200).json({ success: true, item });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/cafe/menu/:id
 * Delete (or soft-delete) a menu item.
 */
export const deleteMenuItemHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await deleteMenuItem(id);
    return res.status(200).json({ success: true, message: "Item archived.", item });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/cafe/orders/:id
 * Get single order by ID with ownership checks.
 */
export const getOrderByIdHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await getOrderById(id, req.user?.id, req.user?.role);
    return res.status(200).json({ success: true, order });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/cafe/orders/:id/receipt
 * Get receipt JSON for an order.
 */
export const getOrderReceiptHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const receipt = await getOrderReceipt(id, req.user?.id, req.user?.role);
    return res.status(200).json({ success: true, receipt });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/cafe/orders/:id/receipt/pdf
 * Download PDF receipt for an order.
 */
export const downloadReceiptPdfHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const receipt = await getOrderReceipt(id, req.user?.id, req.user?.role);
    const pdfBuffer = generateReceiptPdfBuffer(receipt);

    const safeNumber = (receipt.order_number || id).replace(/[^A-Za-z0-9_-]/g, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="receipt-${safeNumber}.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/cafe/orders/summary
 * Get order sales summary (date range filterable).
 */
export const getOrderSummaryHandler = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const summary = await getOrderSummary({ startDate: start_date, endDate: end_date });
    return res.status(200).json({ success: true, summary, ...summary });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/cafe/customers/:id
 * Get customer profile details.
 */
export const getCustomerHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await getCustomerById(id);
    return res.status(200).json({ success: true, customer });
  } catch (error) {
    const statusCode = error.statusCode || 404;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};
