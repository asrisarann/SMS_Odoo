import * as scheduleService from "./schedule.service.js";

/**
 * Controller for Creating Staff Schedule
 * Endpoint: POST /schedules
 */
export const createSchedule = async (req, res) => {
  try {
    const { staffId, shiftStart, shiftEnd, notes } = req.body;

    const schedule = await scheduleService.createSchedule({
      staffId,
      shiftStart,
      shiftEnd,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: "Staff schedule created successfully",
      data: schedule,
    });
  } catch (error) {
    if (error instanceof scheduleService.StorageUnavailableError) {
      return res.status(501).json({
        success: false,
        message: error.message,
        error: "STORAGE_UNAVAILABLE",
        details:
          "The current database schema contains no StaffSchedule model or table. Staff scheduling cannot be persisted without a schema update or migration.",
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Error in createSchedule controller:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while creating staff schedule.",
      error: error.message,
    });
  }
};

/**
 * Controller for Listing Staff Schedules
 * Endpoint: GET /schedules
 */
export const getAllSchedules = async (req, res) => {
  try {
    const { staffId, date, page, limit } = req.validatedQuery || req.query;

    const { schedules, pagination } = await scheduleService.getAllSchedules({
      staffId,
      date,
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    });

    return res.status(200).json({
      success: true,
      message: "Staff schedules retrieved successfully",
      data: schedules,
      pagination,
    });
  } catch (error) {
    if (error instanceof scheduleService.StorageUnavailableError) {
      return res.status(501).json({
        success: false,
        message: error.message,
        error: "STORAGE_UNAVAILABLE",
        details:
          "The current database schema contains no StaffSchedule model or table. Staff scheduling cannot be persisted without a schema update or migration.",
      });
    }

    console.error("Error in getAllSchedules controller:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while retrieving staff schedules.",
      error: error.message,
    });
  }
};

/**
 * Controller for Getting Staff Schedule by ID
 * Endpoint: GET /schedules/:id
 */
export const getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await scheduleService.getScheduleById(id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: `Schedule with ID '${id}' not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Staff schedule retrieved successfully",
      data: schedule,
    });
  } catch (error) {
    if (error instanceof scheduleService.StorageUnavailableError) {
      return res.status(501).json({
        success: false,
        message: error.message,
        error: "STORAGE_UNAVAILABLE",
        details:
          "The current database schema contains no StaffSchedule model or table. Staff scheduling cannot be persisted without a schema update or migration.",
      });
    }

    console.error("Error in getScheduleById controller:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while retrieving staff schedule.",
      error: error.message,
    });
  }
};

/**
 * Controller for Updating Staff Schedule
 * Endpoint: PATCH /schedules/:id
 */
export const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updated = await scheduleService.updateSchedule(id, updateData);

    return res.status(200).json({
      success: true,
      message: "Staff schedule updated successfully",
      data: updated,
    });
  } catch (error) {
    if (error instanceof scheduleService.StorageUnavailableError) {
      return res.status(501).json({
        success: false,
        message: error.message,
        error: "STORAGE_UNAVAILABLE",
        details:
          "The current database schema contains no StaffSchedule model or table. Staff scheduling cannot be persisted without a schema update or migration.",
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Error in updateSchedule controller:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while updating staff schedule.",
      error: error.message,
    });
  }
};

/**
 * Controller for Deleting Staff Schedule
 * Endpoint: DELETE /schedules/:id
 */
export const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    await scheduleService.deleteSchedule(id);

    return res.status(200).json({
      success: true,
      message: "Staff schedule deleted successfully",
    });
  } catch (error) {
    if (error instanceof scheduleService.StorageUnavailableError) {
      return res.status(501).json({
        success: false,
        message: error.message,
        error: "STORAGE_UNAVAILABLE",
        details:
          "The current database schema contains no StaffSchedule model or table. Staff scheduling cannot be persisted without a schema update or migration.",
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Error in deleteSchedule controller:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while deleting staff schedule.",
      error: error.message,
    });
  }
};
