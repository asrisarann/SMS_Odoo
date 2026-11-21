/**
 * Validation middleware for Staff Schedule operations
 */

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Helper to validate ISO Date strings
 */
const isValidDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
};

/**
 * Validate POST /schedules request body
 */
export const validateCreateSchedule = (req, res, next) => {
  const { staffId, shiftStart, shiftEnd, notes } = req.body || {};
  const errors = [];

  // staffId validation
  const cleanedStaffId = typeof staffId === "string" ? staffId.trim() : String(staffId || "").trim();
  if (!cleanedStaffId) {
    errors.push("Staff ID (staffId) is required.");
  }

  // shiftStart validation
  if (!shiftStart) {
    errors.push("Shift start time (shiftStart) is required.");
  } else if (!isValidDate(shiftStart)) {
    errors.push("Shift start time (shiftStart) must be a valid ISO DateTime string.");
  }

  // shiftEnd validation
  if (!shiftEnd) {
    errors.push("Shift end time (shiftEnd) is required.");
  } else if (!isValidDate(shiftEnd)) {
    errors.push("Shift end time (shiftEnd) must be a valid ISO DateTime string.");
  }

  // Check start < end
  if (isValidDate(shiftStart) && isValidDate(shiftEnd)) {
    const start = new Date(shiftStart);
    const end = new Date(shiftEnd);
    if (end <= start) {
      errors.push("Shift end time (shiftEnd) must be after shift start time (shiftStart).");
    }
  }

  // notes validation (optional)
  let cleanedNotes = null;
  if (notes !== undefined && notes !== null) {
    if (typeof notes !== "string") {
      errors.push("Notes must be a string if provided.");
    } else if (notes.trim().length > 500) {
      errors.push("Notes must not exceed 500 characters.");
    } else {
      cleanedNotes = notes.trim() || null;
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  req.body = {
    staffId: cleanedStaffId,
    shiftStart: new Date(shiftStart).toISOString(),
    shiftEnd: new Date(shiftEnd).toISOString(),
    notes: cleanedNotes,
  };

  next();
};

/**
 * Validate GET /schedules query parameters
 */
export const validateGetSchedules = (req, res, next) => {
  const { staffId, date, page, limit } = req.query || {};
  const errors = [];

  const validated = {
    staffId: staffId ? String(staffId).trim() : undefined,
    date: undefined,
    page: 1,
    limit: 10,
  };

  // Date filter validation (YYYY-MM-DD)
  if (date !== undefined && date !== null && String(date).trim() !== "") {
    const dateStr = String(date).trim();
    if (!DATE_REGEX.test(dateStr)) {
      errors.push("Date filter must be in YYYY-MM-DD format.");
    } else {
      const parsedDate = new Date(`${dateStr}T00:00:00.000Z`);
      if (isNaN(parsedDate.getTime())) {
        errors.push("Date filter must be a valid calendar date.");
      } else {
        validated.date = dateStr;
      }
    }
  }

  // Page validation
  if (page !== undefined && page !== null && String(page).trim() !== "") {
    const parsedPage = Number(page);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      errors.push("Page must be a positive integer greater than or equal to 1.");
    } else {
      validated.page = parsedPage;
    }
  }

  // Limit validation
  if (limit !== undefined && limit !== null && String(limit).trim() !== "") {
    const parsedLimit = Number(limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      errors.push("Limit must be an integer between 1 and 100.");
    } else {
      validated.limit = parsedLimit;
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  req.validatedQuery = validated;
  next();
};

/**
 * Validate GET /schedules/:id route parameter
 */
export const validateGetScheduleById = (req, res, next) => {
  const { id } = req.params;
  const cleanedId = (typeof id === "string" ? id.trim() : String(id || "").trim()).replace(/^:/, "");

  if (!cleanedId) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: ["Schedule ID parameter is required."],
    });
  }

  req.params.id = cleanedId;
  next();
};

/**
 * Validate PATCH /schedules/:id request body and route parameter
 */
export const validateUpdateSchedule = (req, res, next) => {
  const { id } = req.params;
  const cleanedId = (typeof id === "string" ? id.trim() : String(id || "").trim()).replace(/^:/, "");

  if (!cleanedId) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: ["Schedule ID parameter is required."],
    });
  }

  const { staffId, shiftStart, shiftEnd, notes } = req.body || {};
  const errors = [];

  const updateData = {};

  if (staffId !== undefined) {
    const cleanedStaffId = typeof staffId === "string" ? staffId.trim() : String(staffId || "").trim();
    if (!cleanedStaffId) {
      errors.push("Staff ID cannot be empty if provided.");
    } else {
      updateData.staffId = cleanedStaffId;
    }
  }

  if (shiftStart !== undefined) {
    if (!isValidDate(shiftStart)) {
      errors.push("Shift start time (shiftStart) must be a valid ISO DateTime string.");
    } else {
      updateData.shiftStart = new Date(shiftStart).toISOString();
    }
  }

  if (shiftEnd !== undefined) {
    if (!isValidDate(shiftEnd)) {
      errors.push("Shift end time (shiftEnd) must be a valid ISO DateTime string.");
    } else {
      updateData.shiftEnd = new Date(shiftEnd).toISOString();
    }
  }

  // Cross-validation if both start and end are supplied
  if (updateData.shiftStart && updateData.shiftEnd) {
    if (new Date(updateData.shiftEnd) <= new Date(updateData.shiftStart)) {
      errors.push("Shift end time (shiftEnd) must be after shift start time (shiftStart).");
    }
  }

  if (notes !== undefined) {
    if (notes === null || notes === "") {
      updateData.notes = null;
    } else if (typeof notes !== "string") {
      errors.push("Notes must be a string if provided.");
    } else if (notes.trim().length > 500) {
      errors.push("Notes must not exceed 500 characters.");
    } else {
      updateData.notes = notes.trim();
    }
  }

  if (Object.keys(updateData).length === 0 && errors.length === 0) {
    errors.push("At least one field (staffId, shiftStart, shiftEnd, notes) must be provided to update.");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  req.params.id = cleanedId;
  req.body = updateData;
  next();
};

/**
 * Validate DELETE /schedules/:id route parameter
 */
export const validateDeleteSchedule = (req, res, next) => {
  const { id } = req.params;
  const cleanedId = (typeof id === "string" ? id.trim() : String(id || "").trim()).replace(/^:/, "");

  if (!cleanedId) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: ["Schedule ID parameter is required."],
    });
  }

  req.params.id = cleanedId;
  next();
};
