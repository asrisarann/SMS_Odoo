import * as leaveService from "./leave.service.js";

/**
 * POST /api/front-desk/staff/leaves
 * POST /api/staff/leaves
 * Submit a new staff leave request.
 */
export const submitLeaveHandler = async (req, res) => {
  try {
    const { staffId, leaveType, startDate, endDate, reason, coverStaffId } = req.body;
    const requesterEmail = req.user?.email;

    const result = await leaveService.submitLeaveRequest({
      staffId,
      leaveType,
      startDate,
      endDate,
      reason,
      coverStaffId,
      requesterEmail,
    });

    return res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Submit leave request error:", error);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/front-desk/staff/leaves
 * GET /api/staff/leaves
 * List all leave requests with filters and pagination.
 */
export const getAllLeavesHandler = async (req, res) => {
  try {
    const { staffId, status, leaveType, year, month, page, limit } = req.query;

    const result = await leaveService.getAllLeaves({
      staffId,
      status,
      leaveType,
      year,
      month,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Get all leaves error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/front-desk/staff/leaves/coverage
 * GET /api/staff/leaves/coverage
 * View upcoming shift coverage gaps due to approved staff leaves.
 */
export const getShiftCoverageSummaryHandler = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const summary = await leaveService.getShiftCoverageSummary({ startDate, endDate });

    return res.status(200).json({
      success: true,
      ...summary,
    });
  } catch (error) {
    console.error("Shift coverage summary error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/front-desk/staff/leaves/:id
 * GET /api/staff/leaves/:id
 * Get single leave request details.
 */
export const getLeaveByIdHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const leave = await leaveService.getLeaveById(id);

    return res.status(200).json({
      success: true,
      data: leave,
    });
  } catch (error) {
    console.error("Get leave by ID error:", error);
    return res.status(error.statusCode || 404).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * PATCH /api/front-desk/staff/leaves/:id/approve
 * PATCH /api/staff/leaves/:id/approve
 * Supervisor / HR Approval.
 */
export const approveLeaveHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNotes, coverStaffId } = req.body;
    const reviewerName = req.user?.name || req.user?.email || "Supervisor";

    const result = await leaveService.approveLeaveRequest({
      leaveId: id,
      reviewedBy: reviewerName,
      reviewNotes,
      coverStaffId,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Approve leave error:", error);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * PATCH /api/front-desk/staff/leaves/:id/reject
 * PATCH /api/staff/leaves/:id/reject
 * Supervisor / HR Rejection.
 */
export const rejectLeaveHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const rejectionReason = req.body.rejectionReason || req.body.reason;
    const reviewerName = req.user?.name || req.user?.email || "Supervisor";

    const result = await leaveService.rejectLeaveRequest({
      leaveId: id,
      reviewedBy: reviewerName,
      rejectionReason,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Reject leave error:", error);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * PATCH /api/front-desk/staff/leaves/:id/cancel
 * Cancel a leave request.
 */
export const cancelLeaveHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    const requesterStaffId = req.user?.staffId || req.body.staffId;

    const result = await leaveService.cancelLeaveRequest({
      leaveId: id,
      requesterStaffId,
      userRole,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Cancel leave error:", error);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/front-desk/staff/:staffId/leave-balance
 * GET /api/staff/:staffId/leave-balance
 * Retrieve staff leave quota, used, pending, and remaining balances.
 */
export const getStaffLeaveBalanceHandler = async (req, res) => {
  try {
    const staffId = req.params.staffId || req.params.id;
    const { year } = req.query;

    const balance = await leaveService.getStaffLeaveBalance(staffId, year);

    return res.status(200).json({
      success: true,
      ...balance,
    });
  } catch (error) {
    console.error("Get staff leave balance error:", error);
    return res.status(error.statusCode || 404).json({
      success: false,
      message: error.message,
    });
  }
};
