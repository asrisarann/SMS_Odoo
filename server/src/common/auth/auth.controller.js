import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../../config/prisma.js";
import { generateOtp, sendOtpEmail, sendEmail } from "../utils/mailer.js";

const JWT_SECRET = process.env.JWT_SECRET || "sms_odoo_jwt_secret_super_secure_key";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// In-memory OTP stores (email -> { otp, otpExpiry, ... })
const pendingRegisterOtps = new Map();
const pendingLoginOtps = new Map();
const pendingResetOtps = new Map();

/**
 * Helper to generate JWT token with role and assigned module.
 */
const generateToken = (account) => {
  return jwt.sign(
    {
      id: account.id,
      email: account.email,
      role: account.role || "MEMBER",
      module: account.module || null,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

/**
 * Helper to resolve user account and role.
 * If user exists in Staff table, role and module are determined from Staff.
 * Otherwise, default role is MEMBER.
 */
const getUserWithRole = async (email) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) return null;

  const staff = await prisma.staff.findUnique({ where: { email: normalizedEmail } });

  return {
    ...user,
    role: staff?.role || "MEMBER",
    module: staff?.designation || null,
    staffRecord: staff || null,
  };
};

/**
 * 1. Send Register OTP:
 * Triggered when user enters their details and clicks "Send OTP".
 * Sends a 6-digit OTP to the email and holds it in temporary memory.
 */
export const sendRegisterOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required to send OTP" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already registered with this email. Please login." });
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    pendingRegisterOtps.set(normalizedEmail, { otp, otpExpiry });

    await sendOtpEmail(normalizedEmail, otp, "Registration");

    return res.status(200).json({
      message: "Verification OTP sent to your email.",
      email: normalizedEmail,
    });
  } catch (error) {
    console.error("Send register OTP error:", error);
    return res.status(500).json({ message: "Failed to send OTP", error: error.message });
  }
};

/**
 * 2. Register User (with OTP Verification):
 * User submits registration details (name, email, phone, password, membership) along with the OTP.
 * Verifies the OTP first; if valid, creates the user in the database, sets JWT cookie, and returns user.
 */
export const register = async (req, res) => {
  try {
    const { name, email, phone, password, membership, otp } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already registered with this email" });
    }

    // If OTP is missing, send OTP first and prompt user to enter it
    if (!otp) {
      return await sendRegisterOtp(req, res);
    }

    // Verify the OTP
    const pending = pendingRegisterOtps.get(normalizedEmail);
    if (!pending || pending.otp !== otp.trim() || pending.otpExpiry < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP code" });
    }

    // OTP is valid - create the user in the database
    const hashedPassword = await bcrypt.hash(password, 10);
    const userPhone = (phone || "").trim() || `user_${Date.now()}`;
    const userMembership = membership ? membership.toUpperCase() : "JUNIOR";

    const newUser = await prisma.user.create({
      data: {
        name: name || "Member",
        email: normalizedEmail,
        phone: userPhone,
        password: hashedPassword,
        membership: userMembership,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        membership: true,
      },
    });

    // Clear pending OTP after successful registration
    pendingRegisterOtps.delete(normalizedEmail);

    const fullUser = {
      ...newUser,
      role: "MEMBER",
      module: null,
    };

    const token = generateToken(fullUser);
    res.cookie("token", token, COOKIE_OPTIONS);

    return res.status(201).json({
      message: "User registered and verified successfully",
      token,
      user: fullUser,
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Registration failed", error: error.message });
  }
};

/**
 * 3. Verify Register OTP (Alias / Fallback):
 */
export const verifyRegisterOtp = async (req, res) => {
  return register(req, res);
};

/**
 * 4. Login User (Step 1):
 * Validates credentials and sends OTP to user email.
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const account = await getUserWithRole(normalizedEmail);

    if (!account) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!account.password) {
      return res.status(400).json({ message: "Account does not have a password configured" });
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    pendingLoginOtps.set(normalizedEmail, { otp, otpExpiry });

    await sendOtpEmail(normalizedEmail, otp, "Login");

    return res.status(200).json({
      message: "Login OTP sent to your email. Please verify to complete login.",
      email: normalizedEmail,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Login failed", error: error.message });
  }
};

/**
 * 5. Verify Login OTP (Step 2):
 * Confirms login OTP, generates JWT token, sets cookie, and returns user info.
 */
export const verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const pending = pendingLoginOtps.get(normalizedEmail);

    if (!pending || pending.otp !== otp.trim() || pending.otpExpiry < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP code" });
    }

    const account = await getUserWithRole(normalizedEmail);
    if (!account) {
      return res.status(404).json({ message: "User not found" });
    }

    // Clear login OTP after successful verification
    pendingLoginOtps.delete(normalizedEmail);

    const safeUser = {
      id: account.id,
      name: account.name,
      email: account.email,
      phone: account.phone,
      membership: account.membership,
      role: account.role,
      module: account.module,
    };

    const token = generateToken(safeUser);
    res.cookie("token", token, COOKIE_OPTIONS);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error("Verify login OTP error:", error);
    return res.status(500).json({ message: "Login verification failed", error: error.message });
  }
};

/**
 * 6. Create Sub-Admin (Admin only):
 * Admin can create sub-admins using email and assign them a specific module (e.g., 'staff', 'sports').
 */
export const createSubAdmin = async (req, res) => {
  try {
    const { name, email, phone, password, module } = req.body;

    if (!email || !password || !module) {
      return res.status(400).json({ message: "Email, password, and assigned module are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user or staff already exists
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    const existingStaff = await prisma.staff.findUnique({ where: { email: normalizedEmail } });

    if (existingUser || existingStaff) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const subPhone = (phone || "").trim() || `staff_${Date.now()}`;
    const moduleName = module.trim();

    // Create Staff entry with SUBADMIN role and assigned module (stored in designation)
    const staff = await prisma.staff.create({
      data: {
        name: name || "Sub-Admin",
        email: normalizedEmail,
        phone: subPhone,
        role: "SUBADMIN",
        designation: moduleName,
        salary: 0,
      },
    });

    // Create User record for authentication
    const user = await prisma.user.create({
      data: {
        name: name || "Sub-Admin",
        email: normalizedEmail,
        phone: subPhone,
        password: hashedPassword,
        membership: "JUNIOR",
      },
    });

    // Notify new sub-admin via email
    await sendEmail({
      to: normalizedEmail,
      subject: "Your Sub-Admin Account Details",
      text: `Hello ${name || ""}, you have been created as a Sub-Admin for the '${moduleName}' module. Your password is: ${password}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Welcome to SMS Odoo</h2>
          <p>You have been assigned as a <strong>Sub-Admin</strong> for module: <strong>${moduleName}</strong>.</p>
          <p>Login Email: <strong>${normalizedEmail}</strong></p>
          <p>Password: <strong>${password}</strong></p>
        </div>
      `,
    });

    const subAdminDetails = {
      id: user.id,
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      module: staff.designation,
      createdAt: staff.createdAt,
    };

    return res.status(201).json({
      message: `Sub-admin created successfully for module '${moduleName}'`,
      subAdmin: subAdminDetails,
    });
  } catch (error) {
    console.error("Create sub-admin error:", error);
    return res.status(500).json({ message: "Failed to create sub-admin", error: error.message });
  }
};

/**
 * 7. Forgot Password:
 * Sends OTP to user's registered email for resetting password (usable by Admin, Sub-Admin, and Members).
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      return res.status(404).json({ message: "No account registered with this email" });
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    pendingResetOtps.set(normalizedEmail, { otp, otpExpiry });

    await sendOtpEmail(normalizedEmail, otp, "Password Reset");

    return res.status(200).json({
      message: "Password reset OTP sent to your email",
      email: normalizedEmail,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ message: "Forgot password request failed", error: error.message });
  }
};

/**
 * 8. Reset Password:
 * Verifies OTP and updates user password.
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const pending = pendingResetOtps.get(normalizedEmail);

    if (!pending || pending.otp !== otp.trim() || pending.otpExpiry < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP code" });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    pendingResetOtps.delete(normalizedEmail);

    return res.status(200).json({
      message: "Password reset successful. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: "Password reset failed", error: error.message });
  }
};

/**
 * 9. Update Profile:
 * Allows authenticated user to update their name and password.
 * Only Admins can modify the module assignment.
 */
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, password, module } = req.body;
    const userId = req.user.id;

    const dataToUpdate = {};
    if (name) dataToUpdate.name = name.trim();
    if (phone) dataToUpdate.phone = phone.trim();
    if (password) dataToUpdate.password = await bcrypt.hash(password, 10);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        membership: true,
      },
    });

    // If Admin is updating module for a staff/subadmin:
    if (module && req.user.role === "ADMIN") {
      await prisma.staff.updateMany({
        where: { email: updatedUser.email },
        data: { designation: module.trim() },
      });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        ...updatedUser,
        role: req.user.role,
        module: module || req.user.module,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ message: "Update failed", error: error.message });
  }
};

/**
 * 10. Logout:
 * Clears authentication cookie.
 */
export const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "strict",
  });
  return res.status(200).json({ message: "Logged out successfully" });
};

/**
 * 11. Get Current User (Get Me):
 * Returns authenticated user profile.
 */
export const getMe = (req, res) => {
  return res.status(200).json({ user: req.user });
};
