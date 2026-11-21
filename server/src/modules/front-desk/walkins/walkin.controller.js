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
