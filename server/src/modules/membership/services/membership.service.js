import prisma from "../../../config/prisma.js";
import { sendEmail } from "../../../common/utils/mailer.js";
import { addReminderJob, setReminderProcessor } from "../queues/membership-reminder.queue.js";

/**
 * Format a Date object into a readable date string.
 */
export const formatDateString = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  });
};

/**
 * Calculate the number of days remaining until a renewal date.
 */
export const calculateDaysRemaining = (renewalDate, referenceDate = new Date()) => {
  if (!renewalDate) return 0;
  const renewal = new Date(renewalDate).getTime();
  const current = new Date(referenceDate).getTime();
  const diffMs = renewal - current;
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
};

/**
 * Find all users whose membership is expiring within the specified days (default: 2 days)
 * and who haven't already received an expiry reminder within the last 24 hours.
 */
export const findUsersExpiringSoon = async (daysPending = 2) => {
  const now = new Date();
  const targetExpiryWindow = new Date(now.getTime() + daysPending * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Find users with renewalDate within [now, targetExpiryWindow]
  const expiringUsers = await prisma.user.findMany({
    where: {
      renewalDate: {
        gte: now,
        lte: targetExpiryWindow,
      },
      // Avoid sending duplicate reminders on the same day
      OR: [
        { lastReminderSent: null },
        { lastReminderSent: { lt: oneDayAgo } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      membership: true,
      renewalDate: true,
      amount: true,
      lastReminderSent: true,
    },
  });

  return expiringUsers.map((user) => ({
    ...user,
    daysRemaining: calculateDaysRemaining(user.renewalDate, now),
  }));
};

/**
 * Send an email notification reminding the user that their membership will expire soon.
 * Updates the user's `lastReminderSent` timestamp in the database after dispatching.
 */
export const sendMembershipExpiryEmail = async (jobData) => {
  const { userId, name, email, membership, renewalDate, daysRemaining } = jobData;

  const formattedDate = formatDateString(renewalDate);
  const daysText = daysRemaining <= 1 ? "1 day" : `${daysRemaining} days`;

  const subject = `Action Required: Your SMS Odoo ${membership} Membership Expires in ${daysText}`;

  const text = `Hello ${name},\n\nYour ${membership} membership at SMS Odoo will expire on ${formattedDate} (${daysText} remaining).\n\nPlease renew your membership to continue enjoying court bookings and club privileges.\n\nThank you,\nSMS Odoo Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #1e3a8a; color: #ffffff; padding: 20px; text-align: center;">
        <h2 style="margin: 0; font-size: 22px;">SMS Odoo - Membership Renewal Reminder</h2>
      </div>
      <div style="padding: 24px;">
        <p style="font-size: 16px;">Dear <strong>${name}</strong>,</p>
        <p>This is a friendly reminder that your <strong>${membership} Membership</strong> is scheduled to expire in <span style="color: #dc2626; font-weight: bold;">${daysText}</span> on <strong>${formattedDate}</strong>.</p>
        
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Member Name:</strong> ${name}</p>
          <p style="margin: 4px 0;"><strong>Membership Tier:</strong> ${membership}</p>
          <p style="margin: 4px 0;"><strong>Expiry Date:</strong> ${formattedDate}</p>
          <p style="margin: 4px 0;"><strong>Time Remaining:</strong> ${daysText}</p>
        </div>

        <p>To avoid any interruption to your sports court reservations, club facilities, and membership benefits, please renew your membership at your earliest convenience.</p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="#" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Renew Membership
          </a>
        </div>

        <p style="font-size: 13px; color: #6b7280; margin-top: 24px;">
          If you have already renewed your membership recently, please disregard this notice. For assistance, contact club support.
        </p>
      </div>
      <div style="background-color: #f9fafb; padding: 12px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
        &copy; ${new Date().getFullYear()} SMS Odoo. All rights reserved.
      </div>
    </div>
  `;

  // Send the email via configured mailer
  await sendEmail({ to: email, subject, text, html });

  // Update lastReminderSent timestamp on the user record in database
  if (userId) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastReminderSent: new Date() },
      });
    } catch (err) {
      console.warn(`Failed to update lastReminderSent for user ${userId}:`, err.message);
    }
  }

  return { success: true, email, userId };
};

/**
 * Scan database for expiring memberships and queue automated reminder emails.
 * Supports configurable days threshold (default: 2 days).
 */
export const processExpiringMemberships = async (daysPending = 2) => {
  const expiringUsers = await findUsersExpiringSoon(daysPending);

  const queuedResults = [];

  for (const user of expiringUsers) {
    const jobData = {
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      membership: user.membership,
      renewalDate: user.renewalDate,
      daysRemaining: user.daysRemaining,
    };

    const queueResult = await addReminderJob(jobData);
    queuedResults.push({
      userId: user.id,
      email: user.email,
      daysRemaining: user.daysRemaining,
      queueResult,
    });
  }

  return {
    timestamp: new Date().toISOString(),
    daysThreshold: daysPending,
    totalExpiringFound: expiringUsers.length,
    queuedRemindersCount: queuedResults.length,
    reminders: queuedResults,
  };
};

// Wire the email sender function as the default queue processor
setReminderProcessor(sendMembershipExpiryEmail);
