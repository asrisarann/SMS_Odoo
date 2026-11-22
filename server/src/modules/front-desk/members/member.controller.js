import {
  searchMembers,
  getMember360,
  recordMemberCheckIn,
} from "./member.service.js";

/**
 * GET /api/front-desk/members/search
 * Fast search members by name, phone, or email.
 */
export const searchMembersHandler = async (req, res) => {
  try {
    const { query, q, limit } = req.query;
    const searchTerm = query || q || "";

    const results = await searchMembers(searchTerm, limit);
    return res.status(200).json({
      count: results.length,
      members: results,
    });
  } catch (error) {
    console.error("Search members error:", error);
    return res.status(500).json({ message: "Failed to search members", error: error.message });
  }
};

/**
 * GET /api/front-desk/members/phone/:phone
 * Quick lookup by phone number for front desk walk-ins and phone callers.
 */
export const getMemberByPhoneHandler = async (req, res) => {
  try {
    const phone = req.params.phone;
    const member360 = await getMember360(phone, true);
    return res.status(200).json(member360);
  } catch (error) {
    console.error("Get member by phone error:", error);
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};

/**
 * GET /api/front-desk/members/:id
 * GET /api/front-desk/members/:id/history
 * Comprehensive Member 360 profile with all history and entitlements.
 */
export const getMember360Handler = async (req, res) => {
  try {
    const memberId = req.params.id;

    // Authorization: Staff, Subadmin, Admin, SuperAdmin can view any member.
    // Regular members can only view their own profile history.
    if (req.user.role === "MEMBER" && req.user.id !== memberId) {
      return res.status(403).json({
        message: "Forbidden: You are only authorized to view your own profile history.",
      });
    }

    const member360 = await getMember360(memberId, false);
    return res.status(200).json(member360);
  } catch (error) {
    console.error("Get member 360 error:", error);
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};

/**
 * POST /api/front-desk/members/:id/checkin
 * Front desk one-click check-in when a member walks in.
 */
export const checkInMemberHandler = async (req, res) => {
  try {
    const memberId = req.params.id;
    const result = await recordMemberCheckIn(memberId);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Member check-in error:", error);
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};
