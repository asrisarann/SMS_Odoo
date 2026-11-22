import prisma from "../../../../config/prisma.js";
import { sendEmail } from "../../../../common/utils/mailer.js";

/**
 * Validates and normalizes date range to start of day and end of day.
 *
 * @param {string|Date} start
 * @param {string|Date} end
 * @returns {{ startDate: Date, endDate: Date, daysCount: number }}
 */
export const calculateLeaveDays = (start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    const error = new Error("Invalid start or end date format. Use YYYY-MM-DD.");
    error.statusCode = 400;
    throw error;
  }

  // Normalize startDate to 00:00:00 and endDate to 23:59:59.999 UTC
  startDate.setUTCHours(0, 0, 0, 0);
  endDate.setUTCHours(23, 59, 59, 999);

  if (endDate < startDate) {
    const error = new Error("End date cannot be earlier than start date.");
    error.statusCode = 400;
    throw error;
  }

  // Calculate calendar days
  const diffMs = endDate.getTime() - startDate.getTime();
  const daysCount = Math.max(1, Math.round(diffMs / (24 * 60 * 60 * 1000)));

  return { startDate, endDate, daysCount };
};

/**
 * 1. Submit a Staff Leave Request.
 *
 * @param {Object} params
 * @param {string} params.staffId - Staff member UUID
 * @param {'CASUAL' | 'SICK' | 'ANNUAL' | 'EMERGENCY'} [params.leaveType='CASUAL']
 * @param {string} params.startDate - YYYY-MM-DD
 * @param {string} params.endDate - YYYY-MM-DD
 * @param {string} params.reason - Explanation for leave
 * @param {string} [params.coverStaffId] - Optional covering staff member
 * @param {string} [params.requesterEmail] - For self-submission resolution
 */
export const submitLeaveRequest = async ({
  staffId,
  leaveType = "CASUAL",
  startDate: rawStart,
  endDate: rawEnd,
  reason,
  coverStaffId,
  requesterEmail,
}) => {
  // 1. Resolve staff member
  let targetStaffId = staffId;
  if (!targetStaffId && requesterEmail) {
    const staffByEmail = await prisma.staff.findUnique({
      where: { email: requesterEmail },
    });
    if (staffByEmail) {
      targetStaffId = staffByEmail.id;
    }
  }

  if (!targetStaffId) {
    const error = new Error("Staff ID is required to submit a leave request.");
    error.statusCode = 400;
    throw error;
  }

  const staff = await prisma.staff.findUnique({
    where: { id: targetStaffId },
  });

  if (!staff) {
    const error = new Error(`Staff member with ID '${targetStaffId}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  // 2. Validate leave type
  const validTypes = ["CASUAL", "SICK", "ANNUAL", "EMERGENCY"];
  const normalizedType = (leaveType || "CASUAL").toUpperCase();
  if (!validTypes.includes(normalizedType)) {
    const error = new Error(`Invalid leave type '${leaveType}'. Allowed: ${validTypes.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  // 3. Reason requirement
  if (!reason || !reason.trim()) {
    const error = new Error("A clear reason for the leave request is required.");
    error.statusCode = 400;
    throw error;
  }

  // 4. Calculate date range & days
  const { startDate, endDate, daysCount } = calculateLeaveDays(rawStart, rawEnd);

  // 5. Check overlapping leave requests for this staff member
  const overlappingLeave = await prisma.staffLeave.findFirst({
    where: {
      staffId: staff.id,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });

  if (overlappingLeave) {
    const error = new Error(
      `Staff member already has a ${overlappingLeave.status.toLowerCase()} leave request covering this period (from ${overlappingLeave.startDate.toISOString().split("T")[0]} to ${overlappingLeave.endDate.toISOString().split("T")[0]}).`
    );
    error.statusCode = 409;
    throw error;
  }

  // 6. Quota check for current calendar year
  const currentYear = startDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0));
  const yearEnd = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999));

  const existingLeavesThisYear = await prisma.staffLeave.findMany({
    where: {
      staffId: staff.id,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { gte: yearStart, lte: yearEnd },
    },
  });

  let usedAnnual = 0;
  let usedSick = 0;

  for (const l of existingLeavesThisYear) {
    if (l.leaveType === "SICK") {
      usedSick += l.daysCount;
    } else {
      usedAnnual += l.daysCount; // CASUAL, ANNUAL, EMERGENCY draw from annual quota
    }
  }

  if (normalizedType === "SICK") {
    const remainingSick = Math.max(0, staff.sickLeaveQuota - usedSick);
    if (daysCount > remainingSick) {
      const error = new Error(
        `Insufficient sick leave quota. Available: ${remainingSick} days, Requested: ${daysCount} days (Quota: ${staff.sickLeaveQuota}, Already Used/Pending: ${usedSick}).`
      );
      error.statusCode = 400;
      throw error;
    }
  } else {
    const remainingAnnual = Math.max(0, staff.annualLeaveQuota - usedAnnual);
    if (daysCount > remainingAnnual) {
      const error = new Error(
        `Insufficient ${normalizedType} leave quota. Available: ${remainingAnnual} days, Requested: ${daysCount} days (Quota: ${staff.annualLeaveQuota}, Already Used/Pending: ${usedAnnual}).`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // 7. Validate cover staff if provided
  let coveringStaffMember = null;
  if (coverStaffId) {
    if (coverStaffId === staff.id) {
      const error = new Error("Covering staff member cannot be the same as the applicant.");
      error.statusCode = 400;
      throw error;
    }

    coveringStaffMember = await prisma.staff.findUnique({
      where: { id: coverStaffId },
    });

    if (!coveringStaffMember) {
      const error = new Error(`Covering staff member with ID '${coverStaffId}' not found.`);
      error.statusCode = 404;
      throw error;
    }

    // Check if covering staff is already on leave
    const coverOnLeave = await prisma.staffLeave.findFirst({
      where: {
        staffId: coverStaffId,
        status: "APPROVED",
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    if (coverOnLeave) {
      const error = new Error(
        `Proposed covering staff member '${coveringStaffMember.name}' is already on approved leave during this time window.`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // 8. Detect scheduled shifts that will require coverage
  const conflictingShifts = await prisma.staffSchedule.findMany({
    where: {
      staffId: staff.id,
      shiftStart: { lte: endDate },
      shiftEnd: { gte: startDate },
    },
    orderBy: { shiftStart: "asc" },
  });

  // 9. Persist StaffLeave record
  const leave = await prisma.staffLeave.create({
    data: {
      staffId: staff.id,
      leaveType: normalizedType,
      startDate,
      endDate,
      daysCount,
      reason: reason.trim(),
      coverStaffId: coverStaffId || null,
      status: "PENDING",
    },
    include: {
      staff: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          designation: true,
        },
      },
      coverStaff: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          designation: true,
        },
      },
    },
  });

  // 10. Send email notification to staff member
  await sendEmail({
    to: staff.email,
    subject: `Leave Request Submitted: ${normalizedType} (${daysCount} day${daysCount > 1 ? "s" : ""})`,
    text: `Hello ${staff.name},\n\nYour leave request for ${daysCount} day(s) from ${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]} has been submitted and is currently PENDING supervisor approval.\n\nReason: ${reason}\n\nWe will notify you once reviewed.\n\nChampions Club HR`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0369a1; color: #ffffff; padding: 18px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">Staff Leave Request Submitted</h2>
        </div>
        <div style="padding: 20px;">
          <p>Dear <strong>${staff.name}</strong>,</p>
          <p>Your leave request has been logged successfully and is awaiting review by your supervisor.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 6px; font-weight: bold;">Leave Type:</td><td>${normalizedType}</td></tr>
            <tr><td style="padding: 6px; font-weight: bold;">Duration:</td><td>${daysCount} day(s)</td></tr>
            <tr><td style="padding: 6px; font-weight: bold;">Dates:</td><td>${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}</td></tr>
            <tr><td style="padding: 6px; font-weight: bold;">Status:</td><td><span style="background-color: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-weight: bold;">PENDING</span></td></tr>
            <tr><td style="padding: 6px; font-weight: bold;">Reason:</td><td>${reason}</td></tr>
            ${coveringStaffMember ? `<tr><td style="padding: 6px; font-weight: bold;">Covering Staff:</td><td>${coveringStaffMember.name}</td></tr>` : ""}
          </table>
          ${
            conflictingShifts.length > 0
              ? `<div style="background-color: #fffbeb; border: 1px solid #fde68a; padding: 12px; border-radius: 6px; margin: 12px 0;">
                   <strong>Note:</strong> You have <strong>${conflictingShifts.length}</strong> scheduled shift(s) during this period that have been flagged for coverage.
                 </div>`
              : ""
          }
        </div>
      </div>
    `,
  });

  return {
    message: "Leave request submitted successfully and is pending supervisor approval.",
    leave,
    shiftsRequiringCoverage: conflictingShifts.map((s) => ({
      scheduleId: s.id,
      shiftStart: s.shiftStart,
      shiftEnd: s.shiftEnd,
      notes: s.notes,
      needsCoverage: true,
    })),
    quotaStatus: {
      leaveType: normalizedType,
      requestedDays: daysCount,
      annualRemaining: Math.max(0, staff.annualLeaveQuota - usedAnnual - (normalizedType !== "SICK" ? daysCount : 0)),
      sickRemaining: Math.max(0, staff.sickLeaveQuota - usedSick - (normalizedType === "SICK" ? daysCount : 0)),
    },
  };
};

/**
 * 2. Get All Leave Requests with Filtering & Pagination.
 */
export const getAllLeaves = async ({
  staffId,
  status,
  leaveType,
  year,
  month,
  page = 1,
  limit = 20,
} = {}) => {
  const where = {};
  const andConditions = [];

  if (staffId) {
    andConditions.push({ staffId });
  }

  if (status) {
    andConditions.push({ status: status.toUpperCase() });
  }

  if (leaveType) {
    andConditions.push({ leaveType: leaveType.toUpperCase() });
  }

  if (year) {
    const yr = parseInt(year, 10);
    const startOfYear = new Date(Date.UTC(yr, month ? parseInt(month, 10) - 1 : 0, 1));
    const endOfYear = new Date(
      Date.UTC(yr, month ? parseInt(month, 10) : 12, 0, 23, 59, 59, 999)
    );
    andConditions.push({
      startDate: { gte: startOfYear, lte: endOfYear },
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * take;

  const [leaves, total, statusCounts] = await Promise.all([
    prisma.staffLeave.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            designation: true,
          },
        },
        coverStaff: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            designation: true,
          },
        },
      },
    }),
    prisma.staffLeave.count({ where }),
    prisma.staffLeave.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
  ]);

  const summary = {
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    CANCELLED: 0,
  };
  for (const s of statusCounts) {
    summary[s.status] = s._count.id;
  }

  return {
    leaves,
    pagination: {
      total,
      page: pageNum,
      limit: take,
      totalPages: Math.ceil(total / take) || 1,
    },
    statusSummary: summary,
  };
};

/**
 * 3. Get Leave Request Details by ID.
 */
export const getLeaveById = async (id) => {
  const leave = await prisma.staffLeave.findUnique({
    where: { id },
    include: {
      staff: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          designation: true,
          annualLeaveQuota: true,
          sickLeaveQuota: true,
        },
      },
      coverStaff: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          designation: true,
        },
      },
    },
  });

  if (!leave) {
    const error = new Error(`Leave request with ID '${id}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  // Fetch conflicting shifts during this leave window
  const shifts = await prisma.staffSchedule.findMany({
    where: {
      staffId: leave.staffId,
      shiftStart: { lte: leave.endDate },
      shiftEnd: { gte: leave.startDate },
    },
    orderBy: { shiftStart: "asc" },
  });

  return {
    ...leave,
    shiftsRequiringCoverage: shifts.map((s) => ({
      scheduleId: s.id,
      shiftStart: s.shiftStart,
      shiftEnd: s.shiftEnd,
      notes: s.notes,
      isCovered: Boolean(leave.coverStaffId),
      coverStaff: leave.coverStaff,
    })),
  };
};

/**
 * 4. Supervisor/HR Approval Workflow (Scene 4).
 * "There are employees to pay, leave to approve..."
 *
 * @param {Object} params
 * @param {string} params.leaveId
 * @param {string} params.reviewedBy - Supervisor/Admin name or ID
 * @param {string} [params.reviewNotes]
 * @param {string} [params.coverStaffId] - Optional reassignment of shift coverage
 */
export const approveLeaveRequest = async ({
  leaveId,
  reviewedBy = "HR Administrator",
  reviewNotes,
  coverStaffId,
}) => {
  const leave = await prisma.staffLeave.findUnique({
    where: { id: leaveId },
    include: { staff: true, coverStaff: true },
  });

  if (!leave) {
    const error = new Error(`Leave request with ID '${leaveId}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  if (leave.status !== "PENDING") {
    const error = new Error(
      `Cannot approve leave request with status '${leave.status}'. Only PENDING requests can be approved.`
    );
    error.statusCode = 400;
    throw error;
  }

  const effectiveCoverId = coverStaffId || leave.coverStaffId;
  let coverStaff = null;

  if (effectiveCoverId) {
    coverStaff = await prisma.staff.findUnique({
      where: { id: effectiveCoverId },
    });
    if (!coverStaff) {
      const error = new Error(`Covering staff member with ID '${effectiveCoverId}' not found.`);
      error.statusCode = 404;
      throw error;
    }
  }

  // 1. Update StaffLeave status to APPROVED
  const updatedLeave = await prisma.staffLeave.update({
    where: { id: leaveId },
    data: {
      status: "APPROVED",
      reviewedBy,
      reviewNotes: reviewNotes || "Leave approved by supervisor.",
      reviewedAt: new Date(),
      coverStaffId: effectiveCoverId || null,
    },
    include: {
      staff: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          designation: true,
        },
      },
      coverStaff: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          designation: true,
        },
      },
    },
  });

  // 2. Manage Shift Coverage: Update scheduled shifts for the staff member on leave
  const affectedShifts = await prisma.staffSchedule.findMany({
    where: {
      staffId: leave.staffId,
      shiftStart: { lte: leave.endDate },
      shiftEnd: { gte: leave.startDate },
    },
  });

  const updatedShifts = [];
  for (const shift of affectedShifts) {
    const noteText = coverStaff
      ? `Shift covered by ${coverStaff.name} (Leave approval: ${updatedLeave.leaveType})`
      : `Staff on approved ${updatedLeave.leaveType} leave - Coverage required`;

    const updated = await prisma.staffSchedule.update({
      where: { id: shift.id },
      data: {
        notes: shift.notes ? `${shift.notes} | ${noteText}` : noteText,
      },
    });
    updatedShifts.push(updated);
  }

  // 3. Send approval confirmation email
  await sendEmail({
    to: leave.staff.email,
    subject: `Leave Approved: ${updatedLeave.leaveType} (${updatedLeave.daysCount} days)`,
    text: `Hello ${leave.staff.name},\n\nYour leave request for ${updatedLeave.daysCount} day(s) from ${updatedLeave.startDate.toISOString().split("T")[0]} to ${updatedLeave.endDate.toISOString().split("T")[0]} has been APPROVED by ${reviewedBy}.\n\nSupervisor remarks: ${updatedLeave.reviewNotes}\n\n${coverStaff ? `Shift coverage arranged with: ${coverStaff.name}` : ""}\n\nChampions Club HR`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #15803d; color: #ffffff; padding: 18px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">Staff Leave Approved</h2>
        </div>
        <div style="padding: 20px;">
          <p>Dear <strong>${leave.staff.name}</strong>,</p>
          <p>Your leave request has been reviewed and <strong style="color: #15803d;">APPROVED</strong>.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 6px; font-weight: bold;">Leave Type:</td><td>${updatedLeave.leaveType}</td></tr>
            <tr><td style="padding: 6px; font-weight: bold;">Duration:</td><td>${updatedLeave.daysCount} day(s)</td></tr>
            <tr><td style="padding: 6px; font-weight: bold;">Dates:</td><td>${updatedLeave.startDate.toISOString().split("T")[0]} to ${updatedLeave.endDate.toISOString().split("T")[0]}</td></tr>
            <tr><td style="padding: 6px; font-weight: bold;">Reviewed By:</td><td>${reviewedBy}</td></tr>
            <tr><td style="padding: 6px; font-weight: bold;">Supervisor Remarks:</td><td>${updatedLeave.reviewNotes}</td></tr>
            ${coverStaff ? `<tr><td style="padding: 6px; font-weight: bold;">Shift Coverage:</td><td>${coverStaff.name}</td></tr>` : ""}
          </table>
          <p>Please coordinate with your team prior to commencing leave.</p>
        </div>
      </div>
    `,
  });

  return {
    message: "Leave request approved successfully.",
    leave: updatedLeave,
    coveredShiftsCount: updatedShifts.length,
    shifts: updatedShifts,
  };
};

/**
 * 5. Supervisor/HR Rejection Workflow.
 *
 * @param {Object} params
 * @param {string} params.leaveId
 * @param {string} params.reviewedBy - Supervisor name or ID
 * @param {string} params.rejectionReason - Mandatory reason for rejecting
 */
export const rejectLeaveRequest = async ({
  leaveId,
  reviewedBy = "HR Administrator",
  rejectionReason,
}) => {
  if (!rejectionReason || !rejectionReason.trim()) {
    const error = new Error("A specific rejection reason is required.");
    error.statusCode = 400;
    throw error;
  }

  const leave = await prisma.staffLeave.findUnique({
    where: { id: leaveId },
    include: { staff: true },
  });

  if (!leave) {
    const error = new Error(`Leave request with ID '${leaveId}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  if (leave.status !== "PENDING") {
    const error = new Error(
      `Cannot reject leave request with status '${leave.status}'. Only PENDING requests can be rejected.`
    );
    error.statusCode = 400;
    throw error;
  }

  const updatedLeave = await prisma.staffLeave.update({
    where: { id: leaveId },
    data: {
      status: "REJECTED",
      reviewedBy,
      reviewNotes: rejectionReason.trim(),
      reviewedAt: new Date(),
    },
    include: {
      staff: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          designation: true,
        },
      },
    },
  });

  // Send rejection email notification
  await sendEmail({
    to: leave.staff.email,
    subject: `Leave Request Update: ${updatedLeave.leaveType} Not Approved`,
    text: `Hello ${leave.staff.name},\n\nYour leave request for ${updatedLeave.daysCount} day(s) from ${updatedLeave.startDate.toISOString().split("T")[0]} to ${updatedLeave.endDate.toISOString().split("T")[0]} could not be approved at this time.\n\nReason: ${rejectionReason}\n\nReviewed by: ${reviewedBy}\n\nChampions Club HR`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #b91c1c; color: #ffffff; padding: 18px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">Staff Leave Request Not Approved</h2>
        </div>
        <div style="padding: 20px;">
          <p>Dear <strong>${leave.staff.name}</strong>,</p>
          <p>Your leave request could not be approved at this time.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 6px; font-weight: bold;">Leave Type:</td><td>${updatedLeave.leaveType}</td></tr>
            <tr><td style="padding: 6px; font-weight: bold;">Dates:</td><td>${updatedLeave.startDate.toISOString().split("T")[0]} to ${updatedLeave.endDate.toISOString().split("T")[0]}</td></tr>
            <tr><td style="padding: 6px; font-weight: bold;">Reviewed By:</td><td>${reviewedBy}</td></tr>
            <tr><td style="padding: 6px; font-weight: bold;">Reason for Rejection:</td><td style="color: #b91c1c; font-weight: bold;">${rejectionReason}</td></tr>
          </table>
          <p>Please consult with your supervisor or front desk manager if you have questions.</p>
        </div>
      </div>
    `,
  });

  return {
    message: "Leave request rejected.",
    leave: updatedLeave,
  };
};

/**
 * 6. Cancel Leave Request (by Staff or Admin).
 */
export const cancelLeaveRequest = async ({ leaveId, requesterStaffId, userRole }) => {
  const leave = await prisma.staffLeave.findUnique({
    where: { id: leaveId },
  });

  if (!leave) {
    const error = new Error(`Leave request with ID '${leaveId}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  if (leave.status === "REJECTED" || leave.status === "CANCELLED") {
    const error = new Error(`Cannot cancel a leave request that is already ${leave.status}.`);
    error.statusCode = 400;
    throw error;
  }

  // Authorization check: Staff can only cancel their own leaves
  const isPrivileged = ["SUPERADMIN", "ADMIN", "SUBADMIN"].includes(userRole);
  if (!isPrivileged && requesterStaffId && leave.staffId !== requesterStaffId) {
    const error = new Error("You are not authorized to cancel another employee's leave request.");
    error.statusCode = 403;
    throw error;
  }

  const updatedLeave = await prisma.staffLeave.update({
    where: { id: leaveId },
    data: {
      status: "CANCELLED",
    },
  });

  return {
    message: "Leave request cancelled successfully.",
    leave: updatedLeave,
  };
};

/**
 * 7. Get Staff Member Leave Quota & Balance.
 */
export const getStaffLeaveBalance = async (staffId, year = new Date().getFullYear()) => {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      designation: true,
      annualLeaveQuota: true,
      sickLeaveQuota: true,
    },
  });

  if (!staff) {
    const error = new Error(`Staff member with ID '${staffId}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  const yr = parseInt(year, 10) || new Date().getFullYear();
  const yearStart = new Date(Date.UTC(yr, 0, 1));
  const yearEnd = new Date(Date.UTC(yr, 11, 31, 23, 59, 59, 999));

  const yearLeaves = await prisma.staffLeave.findMany({
    where: {
      staffId: staff.id,
      startDate: { gte: yearStart, lte: yearEnd },
    },
    orderBy: { startDate: "desc" },
  });

  let approvedAnnual = 0;
  let pendingAnnual = 0;
  let approvedSick = 0;
  let pendingSick = 0;

  for (const l of yearLeaves) {
    if (l.leaveType === "SICK") {
      if (l.status === "APPROVED") approvedSick += l.daysCount;
      if (l.status === "PENDING") pendingSick += l.daysCount;
    } else {
      if (l.status === "APPROVED") approvedAnnual += l.daysCount;
      if (l.status === "PENDING") pendingAnnual += l.daysCount;
    }
  }

  const remainingAnnual = Math.max(0, staff.annualLeaveQuota - approvedAnnual - pendingAnnual);
  const remainingSick = Math.max(0, staff.sickLeaveQuota - approvedSick - pendingSick);

  return {
    staff,
    year: yr,
    summary: {
      annual: {
        quota: staff.annualLeaveQuota,
        approved: approvedAnnual,
        pending: pendingAnnual,
        remaining: remainingAnnual,
      },
      sick: {
        quota: staff.sickLeaveQuota,
        approved: approvedSick,
        pending: pendingSick,
        remaining: remainingSick,
      },
      total: {
        quota: staff.annualLeaveQuota + staff.sickLeaveQuota,
        approved: approvedAnnual + approvedSick,
        pending: pendingAnnual + pendingSick,
        remaining: remainingAnnual + remainingSick,
      },
    },
    leaveHistory: yearLeaves.map((l) => ({
      id: l.id,
      leaveType: l.leaveType,
      startDate: l.startDate,
      endDate: l.endDate,
      daysCount: l.daysCount,
      status: l.status,
      reason: l.reason,
      reviewedBy: l.reviewedBy,
      createdAt: l.createdAt,
    })),
  };
};

/**
 * 8. Shift Coverage & Gap Analysis.
 * Identifies scheduled shifts that fall during approved staff leaves.
 */
export const getShiftCoverageSummary = async ({ startDate: rawStart, endDate: rawEnd } = {}) => {
  const now = new Date();
  const start = rawStart ? new Date(rawStart) : new Date(now.setUTCHours(0, 0, 0, 0));
  const end = rawEnd
    ? new Date(rawEnd)
    : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead

  // 1. Find all approved leaves in this window
  const activeLeaves = await prisma.staffLeave.findMany({
    where: {
      status: "APPROVED",
      startDate: { lte: end },
      endDate: { gte: start },
    },
    include: {
      staff: {
        select: {
          id: true,
          name: true,
          role: true,
          designation: true,
        },
      },
      coverStaff: {
        select: {
          id: true,
          name: true,
          role: true,
          designation: true,
        },
      },
    },
  });

  const staffOnLeaveIds = activeLeaves.map((l) => l.staffId);

  // 2. Find shifts for those staff members
  const affectedShifts = await prisma.staffSchedule.findMany({
    where: {
      staffId: { in: staffOnLeaveIds },
      shiftStart: { lte: end },
      shiftEnd: { gte: start },
    },
    include: {
      staff: {
        select: {
          id: true,
          name: true,
          role: true,
          designation: true,
        },
      },
    },
    orderBy: { shiftStart: "asc" },
  });

  // Map coverage status
  const coverageMap = [];
  let coveredCount = 0;
  let uncoveredCount = 0;

  for (const shift of affectedShifts) {
    const correspondingLeave = activeLeaves.find(
      (l) =>
        l.staffId === shift.staffId &&
        l.startDate <= shift.shiftEnd &&
        l.endDate >= shift.shiftStart
    );

    const isCovered = Boolean(correspondingLeave?.coverStaffId);
    if (isCovered) coveredCount++;
    else uncoveredCount++;

    coverageMap.push({
      scheduleId: shift.id,
      staff: shift.staff,
      shiftStart: shift.shiftStart,
      shiftEnd: shift.shiftEnd,
      leaveType: correspondingLeave?.leaveType,
      isCovered,
      coverStaff: correspondingLeave?.coverStaff || null,
      notes: shift.notes,
    });
  }

  return {
    window: {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
    totalActiveLeaves: activeLeaves.length,
    totalShiftsRequiringCoverage: affectedShifts.length,
    coveredShiftsCount: coveredCount,
    uncoveredShiftsCount: uncoveredCount,
    shifts: coverageMap,
  };
};
