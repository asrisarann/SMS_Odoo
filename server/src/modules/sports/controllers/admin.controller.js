import { getAllSportPricing, updateSportPricing } from "../services/pricing.service.js";

/**
 * GET /api/admin/sports/pricing
 * Super Admin: Get all sport pricing configurations.
 */
export const getAdminPricing = async (req, res) => {
  try {
    const pricing = await getAllSportPricing();
    return res.status(200).json({ pricing });
  } catch (error) {
    console.error("Admin get pricing error:", error);
    return res.status(500).json({ message: "Failed to retrieve pricing", error: error.message });
  }
};

/**
 * PUT /api/admin/sports/pricing
 * Super Admin: Update pricing and discounts for a sport.
 */
export const updateAdminPricing = async (req, res) => {
  try {
    const { sport, basePrice, goldDiscount, silverDiscount, juniorDiscount } = req.body;

    if (!sport) {
      return res.status(400).json({ message: "Sport is required" });
    }

    const updated = await updateSportPricing(sport, {
      basePrice,
      goldDiscount,
      silverDiscount,
      juniorDiscount,
    });

    return res.status(200).json({
      message: `Pricing for ${sport} updated successfully`,
      pricing: updated,
    });
  } catch (error) {
    console.error("Admin update pricing error:", error);
    return res.status(400).json({ message: error.message });
  }
};

/**
 * GET /api/admin/sports/config
 * Super Admin: Get operating hours and court capacities.
 */
export const getAdminConfig = async (req, res) => {
  try {
    const configs = await getAllSportPricing();
    const result = configs.map((c) => ({
      sport: c.sport,
      capacity: c.capacity,
      openTime: c.openTime,
      closeTime: c.closeTime,
      isActive: c.isActive,
    }));
    return res.status(200).json({ configs: result });
  } catch (error) {
    console.error("Admin get config error:", error);
    return res.status(500).json({ message: "Failed to retrieve config", error: error.message });
  }
};

/**
 * PUT /api/admin/sports/config
 * Super Admin: Update operating hours and court capacity for a sport.
 */
export const updateAdminConfig = async (req, res) => {
  try {
    const { sport, capacity, openTime, closeTime, isActive } = req.body;

    if (!sport) {
      return res.status(400).json({ message: "Sport is required" });
    }

    const updated = await updateSportPricing(sport, {
      capacity,
      openTime,
      closeTime,
      isActive,
    });

    return res.status(200).json({
      message: `Configuration for ${sport} updated successfully`,
      config: {
        sport: updated.sport,
        capacity: updated.capacity,
        openTime: updated.openTime,
        closeTime: updated.closeTime,
        isActive: updated.isActive,
      },
    });
  } catch (error) {
    console.error("Admin update config error:", error);
    return res.status(400).json({ message: error.message });
  }
};
