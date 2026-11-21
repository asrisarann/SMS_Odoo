import * as walkinService from "./walkin.service.js";

/**
 * Controller for Walk-in Visitor Registration
 * Endpoint: POST /walkins/register
 */
export const registerWalkin = async (req, res) => {
  try {
    const { name, phone, email, membership } = req.body;

    const result = await walkinService.registerWalkinUser({
      name,
      phone,
      email,
      membership,
    });

    if (result.isNew) {
      return res.status(201).json({
        success: true,
        message: result.message,
        data: result.user,
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.user,
    });
  } catch (error) {
    // Handle duplicate conflict (Prisma P2002 or custom 409)
    if (error.statusCode === 409 || error.code === "P2002") {
      const target = error.meta?.target;
      const targetStr = Array.isArray(target) ? target.join(", ") : target || error.field || "field";
      return res.status(409).json({
        success: false,
        message: error.message || `Conflict: A user with this ${targetStr} already exists.`,
      });
    }

    console.error("Error in registerWalkin controller:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred during walk-in registration.",
      error: error.message,
    });
  }
};

/**
 * Controller for Getting All Walk-in Records
 * Endpoint: GET /walkins
 */
export const getAllWalkins = async (req, res) => {
  try {
    const { search, membership, date, page, limit } = req.validatedQuery || req.query;

    const { users, pagination } = await walkinService.getAllWalkinUsers({
      search,
      membership,
      date,
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    });

    return res.status(200).json({
      success: true,
      message: "Walk-in records retrieved successfully",
      data: users,
      pagination,
    });
  } catch (error) {
    console.error("Error in getAllWalkins controller:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while retrieving walk-in records.",
      error: error.message,
    });
  }
};

/**
 * Controller for Getting Walk-in Record by Phone Number
 * Endpoint: GET /walkins/:phone
 */
export const getWalkinByPhone = async (req, res) => {
  try {
    const { phone } = req.params;

    const user = await walkinService.getWalkinUserByPhone(phone);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `Walk-in record with phone number '${phone}' not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Walk-in details retrieved successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error in getWalkinByPhone controller:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while retrieving walk-in details.",
      error: error.message,
    });
  }
};

/**
 * Controller for Getting Walk-in Statistics
 * Endpoint: GET /walkins/stats
 */
export const getWalkinStats = async (req, res) => {
  try {
    const stats = await walkinService.getWalkinStats();

    return res.status(200).json({
      success: true,
      message: "Walk-in statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    console.error("Error in getWalkinStats controller:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while retrieving walk-in statistics.",
      error: error.message,
    });
  }
};
