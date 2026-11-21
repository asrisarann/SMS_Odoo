import nodemailer from "nodemailer";

/**
 * Configure Nodemailer transport.
 * If SMTP credentials are provided in env, use them.
 * Otherwise, log to console in development so execution never fails.
 */
let transporter = null;

if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// Store last sent OTP for development debugging/testing
export const devOtpStore = new Map();

/**
 * Generate a random 6-digit numeric OTP string.
 */
export const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send an email with OTP or notification.
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || `"SMS Odoo" <no-reply@smsodoo.com>`,
        to,
        subject,
        text,
        html,
      });
      return info;
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error.message);
      // Fallback to console output so development and testing continue smoothly
      console.log(`[EMAIL FALLBACK] To: ${to} | Subject: ${subject} | Content: ${text || html}`);
      return { fallback: true };
    }
  } else {
    // Development console logging
    console.log(`\n======================================================`);
    console.log(`[DEV EMAIL SENDER]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${text || html}`);
    console.log(`======================================================\n`);
    return { dev: true };
  }
};

/**
 * Helper to send OTP emails formatted cleanly.
 */
export const sendOtpEmail = async (email, otp, purpose = "Verification") => {
  devOtpStore.set(email.trim().toLowerCase(), otp);
  const subject = `Your ${purpose} OTP Code`;
  const text = `Your OTP for ${purpose} is: ${otp}. It is valid for 10 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #2563eb;">SMS Odoo - ${purpose}</h2>
      <p>Hello,</p>
      <p>Your one-time verification code is:</p>
      <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #1e40af; margin: 16px 0;">
        ${otp}
      </div>
      <p>This code is valid for <strong>10 minutes</strong>. Please do not share it with anyone.</p>
      <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">If you did not request this, please ignore this email.</p>
    </div>
  `;
  return sendEmail({ to: email, subject, text, html });
};
