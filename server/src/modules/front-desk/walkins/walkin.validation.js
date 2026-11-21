/**
 * Validation middleware for Walk-in Visitor Operations
 */

const ALLOWED_MEMBERSHIPS = ["GOLD", "SILVER", "JUNIOR"];
const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate POST /walkins/register request body
 */
export const validateRegisterWalkin = (req, res, next) => {
  const { name, phone, email, membership } = req.body || {};
  const errors = [];

  // Name validation
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    errors.push("Name is required and must be a non-empty string.");
  } else if (name.trim().length < 2) {
    errors.push("Name must be at least 2 characters long.");
  } else if (name.trim().length > 100) {
    errors.push("Name must not exceed 100 characters.");
  }

  // Phone validation (10-digit Indian mobile number)
  const cleanedPhone = typeof phone === "string" ? phone.trim() : String(phone || "").trim();
  if (!cleanedPhone) {
    errors.push("Phone number is required.");
  } else if (!INDIAN_PHONE_REGEX.test(cleanedPhone)) {
    errors.push("Phone must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
  }

  // Email validation
  const cleanedEmail = typeof email === "string" ? email.trim() : "";
  if (!cleanedEmail) {
    errors.push("Email is required.");
  } else if (!EMAIL_REGEX.test(cleanedEmail)) {
    errors.push("Email must be a valid email address.");
  }

  // Membership validation
  const cleanedMembership = typeof membership === "string" ? membership.trim().toUpperCase() : "";
  if (!cleanedMembership) {
    errors.push("Membership is required.");
  } else if (!ALLOWED_MEMBERSHIPS.includes(cleanedMembership)) {
    errors.push(`Membership must be one of: ${ALLOWED_MEMBERSHIPS.join(", ")}.`);
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  // Assign sanitized values back to req.body
  req.body = {
    name: name.trim(),
    phone: cleanedPhone,
    email: cleanedEmail.toLowerCase(),
    membership: cleanedMembership,
  };

  next();
};

/**
 * Validate GET /walkins query parameters
 */
export const validateGetWalkins = (req, res, next) => {
  const { search, membership, date, page, limit } = req.query || {};
  const errors = [];

  const validated = {
    search: search ? String(search).trim() : undefined,
    membership: undefined,
    date: undefined,
    page: 1,
    limit: 10,
  };

  // Membership filter validation
  if (membership !== undefined && membership !== null && String(membership).trim() !== "") {
    const cleanedMembership = String(membership).trim().toUpperCase();
    if (!ALLOWED_MEMBERSHIPS.includes(cleanedMembership)) {
      errors.push(`Membership filter must be one of: ${ALLOWED_MEMBERSHIPS.join(", ")}.`);
    } else {
      validated.membership = cleanedMembership;
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
 * Validate GET /walkins/:phone route parameter
 */
export const validateGetWalkinByPhone = (req, res, next) => {
  const { phone } = req.params;
  // Strip accidental leading colon (e.g. from typing /:9876543210)
  const cleanedPhone = (typeof phone === "string" ? phone.trim() : String(phone || "").trim()).replace(/^:/, "");

  if (!cleanedPhone) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: ["Phone number parameter is required."],
    });
  }

  if (!INDIAN_PHONE_REGEX.test(cleanedPhone)) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: ["Phone must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9."],
    });
  }

  req.params.phone = cleanedPhone;
  next();
};
