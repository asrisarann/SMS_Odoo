/**
 * Validation middleware for Call Log operations
 */

const ALLOWED_CALL_TYPES = ["INCOMING", "OUTGOING"];
const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate POST /call-logs (or /calls) request body
 */
export const validateCreateCallLog = (req, res, next) => {
  const { callerName, phone, callType, purpose, notes } = req.body || {};
  const errors = [];

  // callerName validation
  if (!callerName || typeof callerName !== "string" || callerName.trim().length === 0) {
    errors.push("Caller name is required and must be a non-empty string.");
  } else if (callerName.trim().length < 2) {
    errors.push("Caller name must be at least 2 characters long.");
  } else if (callerName.trim().length > 100) {
    errors.push("Caller name must not exceed 100 characters.");
  }

  // phone validation (10-digit Indian mobile number)
  const cleanedPhone = (typeof phone === "string" ? phone.trim() : String(phone || "").trim()).replace(/^:/, "");
  if (!cleanedPhone) {
    errors.push("Phone number is required.");
  } else if (!INDIAN_PHONE_REGEX.test(cleanedPhone)) {
    errors.push("Phone must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
  }

  // callType validation ('INCOMING' or 'OUTGOING')
  const cleanedCallType = typeof callType === "string" ? callType.trim().toUpperCase() : "";
  if (!cleanedCallType) {
    errors.push("Call type is required.");
  } else if (!ALLOWED_CALL_TYPES.includes(cleanedCallType)) {
    errors.push("Call type must be either 'INCOMING' or 'OUTGOING'.");
  }

  // purpose validation
  if (!purpose || typeof purpose !== "string" || purpose.trim().length === 0) {
    errors.push("Purpose is required and must be a non-empty string.");
  } else if (purpose.trim().length < 2) {
    errors.push("Purpose must be at least 2 characters long.");
  } else if (purpose.trim().length > 255) {
    errors.push("Purpose must not exceed 255 characters.");
  }

  // notes validation (optional)
  let cleanedNotes = null;
  if (notes !== undefined && notes !== null) {
    if (typeof notes !== "string") {
      errors.push("Notes must be a string if provided.");
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
    callerName: callerName.trim(),
    phone: cleanedPhone,
    callType: cleanedCallType,
    purpose: purpose.trim(),
    notes: cleanedNotes,
  };

  next();
};

/**
 * Validate GET /call-logs (or /calls) query parameters
 */
export const validateGetCallLogs = (req, res, next) => {
  const { search, callType, date, page, limit } = req.query || {};
  const errors = [];

  const validated = {
    search: search ? String(search).trim() : undefined,
    callType: undefined,
    date: undefined,
    page: 1,
    limit: 10,
  };

  // callType filter validation
  if (callType !== undefined && callType !== null && String(callType).trim() !== "") {
    const cleanedCallType = String(callType).trim().toUpperCase();
    if (!ALLOWED_CALL_TYPES.includes(cleanedCallType)) {
      errors.push("Call type filter must be either 'INCOMING' or 'OUTGOING'.");
    } else {
      validated.callType = cleanedCallType;
    }
  }

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
 * Validate GET /call-logs/:id (or /calls/:id) route parameter
 */
export const validateGetCallLogById = (req, res, next) => {
  const { id } = req.params;
  const cleanedId = (typeof id === "string" ? id.trim() : String(id || "").trim()).replace(/^:/, "");

  if (!cleanedId) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: ["Call log ID parameter is required."],
    });
  }

  req.params.id = cleanedId;
  next();
};
