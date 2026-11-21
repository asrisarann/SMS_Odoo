import { findUsersExpiringSoon, processExpiringMemberships } from "../services/membership.service.js";

/**
 * GET /api/membership/expiring
 * List members whose membership will expire within the upcoming window (default: 2 days).
 */
export const getExpiringMembers = async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 2;
    const expiringUsers = await findUsersExpiringSoon(days);

    return res.status(200).json({
      daysThreshold: days,
      count: expiringUsers.length,
      members: expiringUsers,
    });
  } catch (error) {
    console.error("getExpiringMembers error:", error);
    return res.status(500).json({
      message: "Failed to retrieve expiring memberships",
      error: error.message,
    });
  }
};

/**
 * POST /api/membership/trigger-expiry-check
 * Manually trigger scanning and automated email reminder sending.
 * Useful for admin console, cron jobs, and integration tests.
 */
export const triggerExpiryCheck = async (req, res) => {
  try {
    const days = parseInt(req.body.days, 10) || 2;
    const report = await processExpiringMemberships(days);

    return res.status(200).json({
      message: `Membership expiry check triggered successfully for a ${days}-day threshold.`,
      report,
    });
  } catch (error) {
    console.error("triggerExpiryCheck error:", error);
    return res.status(500).json({
      message: "Failed to process membership expiry check",
      error: error.message,
    });
  }
};
