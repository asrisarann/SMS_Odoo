import assert from "node:assert";
import jwt from "jsonwebtoken";
import app from "./src/app.js";
import prisma from "./src/config/prisma.js";
import {
  findUsersExpiringSoon,
  processExpiringMemberships,
  calculateDaysRemaining,
} from "./src/modules/membership/services/membership.service.js";
import {
  initReminderQueue,
  closeReminderQueue,
} from "./src/modules/membership/queues/membership-reminder.queue.js";

const JWT_SECRET = process.env.JWT_SECRET || "sms_odoo_jwt_secret_super_secure_key";

let server;
let baseUrl;

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = res.headers.get("content-type") || "";
  let data = null;
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, data };
}

async function runMembershipExpiryTests() {
  console.log("=================================================");
  console.log("   MEMBERSHIP EXPIRATION REMINDER TEST SUITE     ");
  console.log("=================================================");

  // Start HTTP server
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`Test server running at ${baseUrl}`);
      resolve();
    });
  });

  const testEmails = [
    "expiry_test_expiring_soon@test.com",
    "expiry_test_far_future@test.com",
    "expiry_test_already_notified@test.com",
    "expiry_test_admin@test.com",
    "expiry_test_member@test.com",
  ];

  try {
    // 1. Clean up old test data if any
    console.log("\n--- Step 1: Setting up test environment and users ---");
    await prisma.staff.deleteMany({ where: { email: { in: testEmails } } });
    await prisma.user.deleteMany({ where: { email: { in: testEmails } } });

    const now = new Date();
    // Expiration in ~36 hours (1.5 days -> within 2 days threshold)
    const expiringIn36Hours = new Date(now.getTime() + 36 * 60 * 60 * 1000);
    // Expiration in 10 days (outside 2 days threshold)
    const expiringIn10Days = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
    // Expiration in 1 day, but reminder already sent 2 hours ago
    const expiringIn24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // User A: Expiring soon (2 days pending), no reminder sent yet -> MUST BE NOTIFIED
    const userExpiringSoon = await prisma.user.create({
      data: {
        name: "Rahul Verma (Expiring Soon)",
        email: "expiry_test_expiring_soon@test.com",
        phone: "9876540001",
        membership: "GOLD",
        amount: 3500,
        renewalDate: expiringIn36Hours,
        lastReminderSent: null,
      },
    });

    // User B: Expiring in 10 days -> SHOULD NOT BE NOTIFIED
    const userFarFuture = await prisma.user.create({
      data: {
        name: "Pooja Sharma (Far Future)",
        email: "expiry_test_far_future@test.com",
        phone: "9876540002",
        membership: "SILVER",
        amount: 1500,
        renewalDate: expiringIn10Days,
        lastReminderSent: null,
      },
    });

    // User C: Expiring soon, but already notified today -> SHOULD NOT BE NOTIFIED AGAIN
    const userAlreadyNotified = await prisma.user.create({
      data: {
        name: "Amit Patel (Already Notified)",
        email: "expiry_test_already_notified@test.com",
        phone: "9876540003",
        membership: "JUNIOR",
        amount: 800,
        renewalDate: expiringIn24Hours,
        lastReminderSent: twoHoursAgo,
      },
    });

    // Admin user for triggering endpoint
    const adminUser = await prisma.user.create({
      data: {
        name: "Membership Admin",
        email: "expiry_test_admin@test.com",
        phone: "9876540004",
        membership: "GOLD",
        amount: 5000,
      },
    });
    await prisma.staff.create({
      data: {
        name: "Membership Admin Staff",
        email: "expiry_test_admin@test.com",
        phone: "9876540004",
        role: "ADMIN",
        salary: 80000,
      },
    });

    // Regular member user
    const memberUser = await prisma.user.create({
      data: {
        name: "Regular Member",
        email: "expiry_test_member@test.com",
        phone: "9876540005",
        membership: "SILVER",
        amount: 1000,
      },
    });

    const adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email, role: "ADMIN" }, JWT_SECRET, { expiresIn: "1h" });
    const memberToken = jwt.sign({ id: memberUser.id, email: memberUser.email, role: "MEMBER" }, JWT_SECRET, { expiresIn: "1h" });

    console.log("✔ Test users created with distinct expiration and notification profiles.");

    // 2. Unit Calculation & Query Filtering Checks
    console.log("\n--- Step 2: Testing Expiring Membership Query Filter Logic ---");
    const daysCalc = calculateDaysRemaining(expiringIn36Hours, now);
    assert.strictEqual(daysCalc, 2, "Expected 36 hours to round to 2 days remaining");
    console.log(`✔ calculateDaysRemaining correctly calculated ${daysCalc} days for 36 hours ahead.`);

    const expiringMembers = await findUsersExpiringSoon(2);
    const expiringUserIds = expiringMembers.map((u) => u.id);

    assert.ok(expiringUserIds.includes(userExpiringSoon.id), "Target expiring user must be detected");
    assert.ok(!expiringUserIds.includes(userFarFuture.id), "User expiring in 10 days must NOT be included");
    assert.ok(!expiringUserIds.includes(userAlreadyNotified.id), "User already notified today must NOT be included");

    console.log(`✔ findUsersExpiringSoon accurately detected ${expiringMembers.length} user(s) needing reminder.`);

    // 3. Queue & Email Notification Processing
    console.log("\n--- Step 3: Testing Queue Execution and Email Reminder Dispatch ---");
    const processResult = await processExpiringMemberships(2);
    assert.ok(processResult.totalExpiringFound >= 1, "At least 1 expiring user found");
    assert.ok(processResult.queuedRemindersCount >= 1, "At least 1 reminder job queued");
    console.log("✔ Expiry reminders processed and dispatched through queue.");

    // Allow async job execution to finish and database update to complete
    await new Promise((r) => setTimeout(r, 1500));

    // Verify User record updated in DB with lastReminderSent
    const updatedUser = await prisma.user.findUnique({
      where: { id: userExpiringSoon.id },
      select: { lastReminderSent: true },
    });
    assert.ok(updatedUser.lastReminderSent !== null, "User lastReminderSent timestamp must be updated in DB");
    console.log("✔ User's lastReminderSent timestamp updated in DB:", updatedUser.lastReminderSent);

    // Verify deduplication on subsequent run
    console.log("\n--- Step 4: Testing Deduplication (Prevent Spamming Same Day) ---");
    const rerunResult = await processExpiringMemberships(2);
    const recheckedUserIds = (await findUsersExpiringSoon(2)).map((u) => u.id);
    assert.ok(!recheckedUserIds.includes(userExpiringSoon.id), "User should not be flagged again within 24h");
    console.log("✔ Deduplication confirmed: recently notified user is excluded on subsequent checks.");

    // 5. API Endpoints Testing
    console.log("\n--- Step 5: Testing HTTP API Endpoints and Role Protections ---");

    // Unauthenticated GET /api/membership/expiring
    const unauthRes = await request("/api/membership/expiring");
    assert.strictEqual(unauthRes.status, 401, "Expected 401 Unauthorized");
    console.log("✔ Unauthenticated request blocked with 401");

    // Forbidden MEMBER role GET /api/membership/expiring
    const forbiddenRes = await request("/api/membership/expiring", { token: memberToken });
    assert.strictEqual(forbiddenRes.status, 403, "Expected 403 Forbidden for MEMBER role");
    console.log("✔ Regular member blocked from admin membership check with 403");

    // Authorized ADMIN role GET /api/membership/expiring
    const adminGetRes = await request("/api/membership/expiring?days=2", { token: adminToken });
    assert.strictEqual(adminGetRes.status, 200, "Expected 200 OK for ADMIN role");
    assert.strictEqual(typeof adminGetRes.data.count, "number");
    console.log(`✔ Admin retrieved expiring memberships: ${adminGetRes.data.count} member(s).`);

    // Authorized ADMIN POST /api/membership/trigger-expiry-check
    const triggerRes = await request("/api/membership/trigger-expiry-check", {
      method: "POST",
      token: adminToken,
      body: { days: 2 },
    });
    assert.strictEqual(triggerRes.status, 200, "Expected 200 OK for manual trigger");
    assert.ok(triggerRes.data.report, "Expected report in response");
    console.log("✔ Admin manually triggered membership expiry check endpoint with 200 OK.");

    // Clean up test data
    console.log("\n--- Step 6: Cleaning up test artifacts ---");
    await prisma.staff.deleteMany({ where: { email: { in: testEmails } } });
    await prisma.user.deleteMany({ where: { email: { in: testEmails } } });
    console.log("✔ Cleaned up test database records.");

    console.log("\n=================================================");
    console.log("   ALL MEMBERSHIP EXPIRY TESTS PASSED! (6/6)     ");
    console.log("=================================================");
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await closeReminderQueue();
    await prisma.$disconnect();
  }
}

runMembershipExpiryTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failure:", err);
    process.exit(1);
  });
