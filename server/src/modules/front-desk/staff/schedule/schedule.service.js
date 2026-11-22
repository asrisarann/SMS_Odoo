import prisma from "../../../../config/prisma.js";

/**
 * Database Compatibility Check
 *
 * Checks whether Prisma Client has a dedicated model for persistent staff schedule storage
 * (e.g. `prisma.staffSchedule` or `prisma.schedule`).
 *
 * Current Schema State:
 * - Existing models: User, SportsBooking, CafeOrder, SportShopPurchase, Product, Staff, CallLog.
 * - `Staff` model only stores employee profile details (id, name, email, phone, role, designation, salary).
 * - There is NO model or table for shifts / schedules (no shiftStart, shiftEnd, notes, or multi-shift relations).
 * - Per requirements:
 *   "Use only an existing database model or storage mechanism if one genuinely supports storing staff schedules.
 *    If no suitable persistent storage exists:
 *    - Do not invent fields or reuse unrelated models.
 *    - Do not use an in-memory array as a permanent solution.
 *    - Report that persistent Staff Scheduling cannot be implemented without an existing suitable storage mechanism or database schema change."
 */
export const hasPersistentScheduleStorage = () => {
  return Boolean(prisma.staffSchedule || prisma.schedule);
};

export class StorageUnavailableError extends Error {
  constructor(message) {
    super(
      message ||
        "Persistent Staff Scheduling cannot be implemented without an existing suitable storage mechanism or database schema change."
    );
    this.name = "StorageUnavailableError";
    this.statusCode = 501;
  }
}

/**
 * Creates a staff schedule.
 *
 * Validates staff existence and verifies no overlapping shifts for the same staff member.
 *
 * @param {Object} data
 * @param {string} data.staffId
 * @param {string} data.shiftStart
 * @param {string} data.shiftEnd
 * @param {string|null} [data.notes]
 */
export const createSchedule = async ({ staffId, shiftStart, shiftEnd, notes }) => {
  if (!hasPersistentScheduleStorage()) {
    throw new StorageUnavailableError();
  }

  // 1. Verify staff exists in existing Staff table
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
  });

  if (!staff) {
    const error = new Error(`Staff member with ID '${staffId}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  // 2. Validate overlapping shift for the same staff member
  // Condition for overlap: (existingShiftStart < newShiftEnd) AND (existingShiftEnd > newShiftStart)
  const delegate = prisma.staffSchedule || prisma.schedule;
  const overlappingShift = await delegate.findFirst({
    where: {
      staffId,
      shiftStart: { lt: new Date(shiftEnd) },
      shiftEnd: { gt: new Date(shiftStart) },
    },
  });

  if (overlappingShift) {
    const error = new Error("This staff member already has an overlapping shift scheduled during this time window.");
    error.statusCode = 409;
    throw error;
  }

  // 3. Validate staff member is not on approved leave during this shift
  if (prisma.staffLeave) {
    const onLeave = await prisma.staffLeave.findFirst({
      where: {
        staffId,
        status: "APPROVED",
        startDate: { lte: new Date(shiftEnd) },
        endDate: { gte: new Date(shiftStart) },
      },
    });

    if (onLeave) {
      const error = new Error(
        `Cannot schedule shift: Staff member is on approved ${onLeave.leaveType} leave during this time.`
      );
      error.statusCode = 409;
      throw error;
    }
  }

  // 4. Persist new schedule record
  return await delegate.create({
    data: {
      staffId,
      shiftStart: new Date(shiftStart),
      shiftEnd: new Date(shiftEnd),
      notes: notes || null,
    },
    include: {
      staff: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          designation: true,
        },
      },
    },
  });
};

/**
 * Retrieves all staff schedules with date/staff filtering and pagination.
 *
 * @param {Object} params
 * @param {string} [params.staffId]
 * @param {string} [params.date] - YYYY-MM-DD
 * @param {number} [params.page=1]
 * @param {number} [params.limit=10]
 */
export const getAllSchedules = async ({ staffId, date, page = 1, limit = 10 }) => {
  if (!hasPersistentScheduleStorage()) {
    throw new StorageUnavailableError();
  }

  const delegate = prisma.staffSchedule || prisma.schedule;
  const where = {};
  const andConditions = [];

  if (staffId) {
    andConditions.push({ staffId });
  }

  if (date) {
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);
    andConditions.push({
      shiftStart: {
        gte: startOfDay,
        lte: endOfDay,
      },
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const skip = (page - 1) * limit;

  const [schedules, totalRecords] = await Promise.all([
    delegate.findMany({
      where,
      orderBy: { shiftStart: "asc" },
      skip,
      take: limit,
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            designation: true,
          },
        },
      },
    }),
    delegate.count({ where }),
  ]);

  const totalPages = Math.ceil(totalRecords / limit) || 1;

  return {
    schedules,
    pagination: {
      page,
      limit,
      totalRecords,
      totalPages,
    },
  };
};

/**
 * Retrieves a single schedule by ID.
 *
 * @param {string} id
 */
export const getScheduleById = async (id) => {
  if (!hasPersistentScheduleStorage()) {
    throw new StorageUnavailableError();
  }

  const delegate = prisma.staffSchedule || prisma.schedule;
  return await delegate.findUnique({
    where: { id },
    include: {
      staff: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          designation: true,
        },
      },
    },
  });
};

/**
 * Updates a schedule by ID.
 *
 * @param {string} id
 * @param {Object} updateData
 */
export const updateSchedule = async (id, updateData) => {
  if (!hasPersistentScheduleStorage()) {
    throw new StorageUnavailableError();
  }

  const delegate = prisma.staffSchedule || prisma.schedule;

  const existingSchedule = await delegate.findUnique({
    where: { id },
  });

  if (!existingSchedule) {
    const error = new Error(`Schedule with ID '${id}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  const targetStaffId = updateData.staffId || existingSchedule.staffId;
  const targetShiftStart = updateData.shiftStart ? new Date(updateData.shiftStart) : existingSchedule.shiftStart;
  const targetShiftEnd = updateData.shiftEnd ? new Date(updateData.shiftEnd) : existingSchedule.shiftEnd;

  if (targetShiftEnd <= targetShiftStart) {
    const error = new Error("Shift end time must be after shift start time.");
    error.statusCode = 400;
    throw error;
  }

  // If staffId changed, ensure new staff exists
  if (updateData.staffId && updateData.staffId !== existingSchedule.staffId) {
    const staff = await prisma.staff.findUnique({
      where: { id: updateData.staffId },
    });
    if (!staff) {
      const error = new Error(`Staff member with ID '${updateData.staffId}' not found.`);
      error.statusCode = 404;
      throw error;
    }
  }

  // Check overlapping shifts (excluding current schedule record)
  const overlappingShift = await delegate.findFirst({
    where: {
      id: { not: id },
      staffId: targetStaffId,
      shiftStart: { lt: targetShiftEnd },
      shiftEnd: { gt: targetShiftStart },
    },
  });

  if (overlappingShift) {
    const error = new Error("The updated shift times overlap with another scheduled shift for this staff member.");
    error.statusCode = 409;
    throw error;
  }

  const dataToUpdate = {};
  if (updateData.staffId !== undefined) dataToUpdate.staffId = updateData.staffId;
  if (updateData.shiftStart !== undefined) dataToUpdate.shiftStart = targetShiftStart;
  if (updateData.shiftEnd !== undefined) dataToUpdate.shiftEnd = targetShiftEnd;
  if (updateData.notes !== undefined) dataToUpdate.notes = updateData.notes;

  return await delegate.update({
    where: { id },
    data: dataToUpdate,
    include: {
      staff: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          designation: true,
        },
      },
    },
  });
};

/**
 * Deletes a schedule by ID.
 *
 * @param {string} id
 */
export const deleteSchedule = async (id) => {
  if (!hasPersistentScheduleStorage()) {
    throw new StorageUnavailableError();
  }

  const delegate = prisma.staffSchedule || prisma.schedule;

  const existingSchedule = await delegate.findUnique({
    where: { id },
  });

  if (!existingSchedule) {
    const error = new Error(`Schedule with ID '${id}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  return await delegate.delete({
    where: { id },
  });
};
