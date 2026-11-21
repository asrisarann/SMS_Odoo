/**
 * Validation middleware for Walk-in Visitor Registration
 */

const ALLOWED_MEMBERSHIPS = ["GOLD", "SILVER", "JUNIOR"];
const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
