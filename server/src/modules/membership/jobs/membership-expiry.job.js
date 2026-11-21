import { initReminderQueue, closeReminderQueue } from "../queues/membership-reminder.queue.js";
import { processExpiringMemberships, sendMembershipExpiryEmail } from "../services/membership.service.js";

let intervalId = null;
let isJobRunning = false;

/**
 * Execute a single cycle of the membership expiry check.
 */
export const runMembershipExpiryCycle = async (daysPending = 2) => {
  if (isJobRunning) {
    console.log("[MembershipExpiryJob] Previous cycle is still running. Skipping.");
    return;
  }

  isJobRunning = true;
  try {
    const result = await processExpiringMemberships(daysPending);
    if (result.totalExpiringFound > 0) {
      console.log(
        `[MembershipExpiryJob] Processed ${result.totalExpiringFound} member(s) expiring within ${daysPending} days.`
      );
    }
    return result;
  } catch (error) {
    console.error("[MembershipExpiryJob] Error running expiry cycle:", error.message);
  } finally {
    isJobRunning = false;
  }
};

/**
 * Start the background membership expiry reminder worker.
 * Default interval: once every hour (3600000 ms).
 */
export const startMembershipExpiryJob = async (intervalMs = 3600000, daysPending = 2) => {
  if (intervalId) return;

  // Initialize BullMQ Queue / in-memory worker with the email sender function
  await initReminderQueue(sendMembershipExpiryEmail);

  // Run initial check on startup after a brief delay (3 seconds)
  setTimeout(() => {
    runMembershipExpiryCycle(daysPending).catch((err) => {
      console.error("[MembershipExpiryJob] Initial check error:", err.message);
    });
  }, 3000);

  // Set up recurring schedule
  intervalId = setInterval(() => {
    runMembershipExpiryCycle(daysPending).catch((err) => {
      console.error("[MembershipExpiryJob] Scheduled check error:", err.message);
    });
  }, intervalMs);

  console.log(`[MembershipExpiryJob] Background worker started (interval: ${intervalMs / 1000}s, threshold: ${daysPending} days).`);
};

/**
 * Stop the background worker and close queue connections.
 */
export const stopMembershipExpiryJob = async () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  await closeReminderQueue();
  console.log("[MembershipExpiryJob] Background worker stopped.");
};
