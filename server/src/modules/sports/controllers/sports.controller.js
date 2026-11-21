import { getSportsList, getSportSlotsAvailability } from "../services/sports.service.js";
import { getAllSportPricing } from "../services/pricing.service.js";

/**
 * GET /api/sports
 * List all sports, courts, capacities, and operating hours.
 */
export const getSports = async (req, res) => {
  try {
    const sports = await getSportsList();
    return res.status(200).json({ sports });
  } catch (error) {
    console.error("Get sports error:", error);
    return res.status(500).json({ message: "Failed to retrieve sports", error: error.message });
  }
};

/**
 * GET /api/sports/slots?date=YYYY-MM-DD&sport=CRICKET
 * Retrieve 30-minute interval slot availability for a given sport and date.
 */
export const getSlots = async (req, res) => {
  try {
    const { date, sport } = req.query;

    if (!date || !sport) {
      return res.status(400).json({
        message: "Query parameters 'date' (YYYY-MM-DD) and 'sport' (e.g. CRICKET) are required.",
      });
    }

    // Validate date format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ message: "Invalid date format. Expected YYYY-MM-DD." });
    }

    const slots = await getSportSlotsAvailability(sport, date);
    return res.status(200).json({
      sport: sport.toUpperCase(),
      date,
      slots,
    });
  } catch (error) {
    console.error("Get slots error:", error);
    return res.status(500).json({ message: "Failed to retrieve slots", error: error.message });
  }
};

/**
 * GET /api/sports/pricing
 * Retrieve base pricing and discounts for all sports.
 */
export const getPricing = async (req, res) => {
  try {
    const pricing = await getAllSportPricing();
    return res.status(200).json({ pricing });
  } catch (error) {
    console.error("Get pricing error:", error);
    return res.status(500).json({ message: "Failed to retrieve pricing", error: error.message });
  }
};
