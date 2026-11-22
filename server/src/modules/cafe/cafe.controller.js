import {
  getMenuItems,
  toggleMenuItemAvailability,
  createCafeOrder,
  getCafeOrders,
  getUserCafeOrders,
  updateCafeOrderStatus,
  getBarStats,
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
