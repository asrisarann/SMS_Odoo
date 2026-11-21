import assert from "node:assert";
import jwt from "jsonwebtoken";
import app from "./src/app.js";
import prisma from "./src/config/prisma.js";

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

async function runRoleVerificationTests() {
  console.log("=================================================");
  console.log("   USER ROLE & SUPERADMIN VERIFICATION TEST SUITE");
  console.log("=================================================");

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`Test server running at ${baseUrl}`);
      resolve();
    });
  });

  try {
    const testEmails = [
      "role_superadmin_test@test.com",
      "role_admin_test@test.com",
      "role_subadmin_test@test.com",
      "role_staff_test@test.com",
      "role_member_test@test.com",
      "role_promote_test@test.com",
    ];

    // Cleanup previous test users
    await prisma.staff.deleteMany({ where: { email: { in: testEmails } } });
    await prisma.user.deleteMany({ where: { email: { in: testEmails } } });

    console.log("\n--- Step 1: Creating Users with Each Role in Database ---");

    const superAdminUser = await prisma.user.create({
      data: {
        name: "SuperAdmin User",
        email: "role_superadmin_test@test.com",
        phone: "9100000001",
        membership: "GOLD",
        role: "SUPERADMIN",
      },
    });

    const adminUser = await prisma.user.create({
      data: {
        name: "Admin User",
        email: "role_admin_test@test.com",
        phone: "9100000002",
        membership: "GOLD",
        role: "ADMIN",
      },
    });

    const subAdminUser = await prisma.user.create({
      data: {
        name: "SubAdmin User",
        email: "role_subadmin_test@test.com",
        phone: "9100000003",
        membership: "SILVER",
        role: "SUBADMIN",
      },
    });

    const staffUser = await prisma.user.create({
      data: {
        name: "Staff User",
        email: "role_staff_test@test.com",
        phone: "9100000004",
        membership: "JUNIOR",
        role: "STAFF",
      },
    });

    const memberUser = await prisma.user.create({
      data: {
        name: "Member User",
        email: "role_member_test@test.com",
        phone: "9100000005",
        membership: "JUNIOR",
        role: "MEMBER",
      },
    });

    const promoteUser = await prisma.user.create({
      data: {
        name: "Promote Tester",
        email: "role_promote_test@test.com",
        phone: "9100000006",
        membership: "JUNIOR",
        role: "MEMBER",
      },
    });

    assert.strictEqual(superAdminUser.role, "SUPERADMIN");
    assert.strictEqual(adminUser.role, "ADMIN");
    assert.strictEqual(subAdminUser.role, "SUBADMIN");
    assert.strictEqual(staffUser.role, "STAFF");
    assert.strictEqual(memberUser.role, "MEMBER");
    console.log("✔ Created users with database roles: SUPERADMIN, ADMIN, SUBADMIN, STAFF, MEMBER");

    // Tokens
    const superAdminToken = jwt.sign({ id: superAdminUser.id, email: superAdminUser.email }, JWT_SECRET, { expiresIn: "1h" });
    const adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email }, JWT_SECRET, { expiresIn: "1h" });
    const subAdminToken = jwt.sign({ id: subAdminUser.id, email: subAdminUser.email }, JWT_SECRET, { expiresIn: "1h" });
    const staffToken = jwt.sign({ id: staffUser.id, email: staffUser.email }, JWT_SECRET, { expiresIn: "1h" });
    const memberToken = jwt.sign({ id: memberUser.id, email: memberUser.email }, JWT_SECRET, { expiresIn: "1h" });

    // Step 2: Test /api/auth/verify-role endpoint
    console.log("\n--- Step 2: Testing GET /api/auth/verify-role for Each Role ---");

    const superAdminVerify = await request("/api/auth/verify-role", { token: superAdminToken });
    assert.strictEqual(superAdminVerify.status, 200);
    assert.strictEqual(superAdminVerify.data.role, "SUPERADMIN");
    assert.strictEqual(superAdminVerify.data.isSuperAdmin, true);
    assert.strictEqual(superAdminVerify.data.isSubAdmin, false);
    assert.strictEqual(superAdminVerify.data.isMember, false);
    console.log("✔ SUPERADMIN correctly verified: isSuperAdmin=true, role=SUPERADMIN");

    const adminVerify = await request("/api/auth/verify-role", { token: adminToken });
    assert.strictEqual(adminVerify.status, 200);
    assert.strictEqual(adminVerify.data.role, "ADMIN");
    assert.strictEqual(adminVerify.data.isSuperAdmin, true);
    console.log("✔ ADMIN correctly verified: isSuperAdmin=true, role=ADMIN");

    const subAdminVerify = await request("/api/auth/verify-role", { token: subAdminToken });
    assert.strictEqual(subAdminVerify.status, 200);
    assert.strictEqual(subAdminVerify.data.role, "SUBADMIN");
    assert.strictEqual(subAdminVerify.data.isSuperAdmin, false);
    assert.strictEqual(subAdminVerify.data.isSubAdmin, true);
    console.log("✔ SUBADMIN correctly verified: isSuperAdmin=false, isSubAdmin=true, role=SUBADMIN");

    const staffVerify = await request("/api/auth/verify-role", { token: staffToken });
    assert.strictEqual(staffVerify.status, 200);
    assert.strictEqual(staffVerify.data.role, "STAFF");
    assert.strictEqual(staffVerify.data.isSuperAdmin, false);
    assert.strictEqual(staffVerify.data.isStaff, true);
    console.log("✔ STAFF correctly verified: isSuperAdmin=false, isStaff=true, role=STAFF");

    const memberVerify = await request("/api/auth/verify-role", { token: memberToken });
    assert.strictEqual(memberVerify.status, 200);
    assert.strictEqual(memberVerify.data.role, "MEMBER");
    assert.strictEqual(memberVerify.data.isSuperAdmin, false);
    assert.strictEqual(memberVerify.data.isMember, true);
    console.log("✔ MEMBER correctly verified: isSuperAdmin=false, isMember=true, role=MEMBER");

    // Step 3: Test SuperAdmin Verification Guard Endpoint
    console.log("\n--- Step 3: Testing GET /api/auth/verify-superadmin Role Guard ---");

    const saGuardRes = await request("/api/auth/verify-superadmin", { token: superAdminToken });
    assert.strictEqual(saGuardRes.status, 200);
    assert.strictEqual(saGuardRes.data.success, true);
    console.log("✔ SUPERADMIN passed verify-superadmin with 200");

    const adminGuardRes = await request("/api/auth/verify-superadmin", { token: adminToken });
    assert.strictEqual(adminGuardRes.status, 200);
    console.log("✔ ADMIN passed verify-superadmin with 200");

    const subAdminGuardRes = await request("/api/auth/verify-superadmin", { token: subAdminToken });
    assert.strictEqual(subAdminGuardRes.status, 403);
    console.log("✔ SUBADMIN blocked from verify-superadmin with 403");

    const memberGuardRes = await request("/api/auth/verify-superadmin", { token: memberToken });
    assert.strictEqual(memberGuardRes.status, 403);
    console.log("✔ MEMBER blocked from verify-superadmin with 403");

    // Step 4: Test GET /api/super-admin/verify endpoint
    console.log("\n--- Step 4: Testing GET /api/super-admin/verify Endpoint ---");

    const superAdminPortalVerify = await request("/api/super-admin/verify", { token: superAdminToken });
    assert.strictEqual(superAdminPortalVerify.status, 200);
    assert.strictEqual(superAdminPortalVerify.data.isSuperAdmin, true);
    assert.strictEqual(superAdminPortalVerify.data.user.role, "SUPERADMIN");
    console.log("✔ SuperAdmin confirmed via /api/super-admin/verify");

    const memberPortalVerify = await request("/api/super-admin/verify", { token: memberToken });
    assert.strictEqual(memberPortalVerify.status, 403);
    console.log("✔ Member blocked from /api/super-admin/verify with 403");

    // Step 5: Test SuperAdmin Role Assignment (PUT /api/super-admin/users/:id/role)
    console.log("\n--- Step 5: Testing Role Updates via PUT /api/super-admin/users/:id/role ---");

    // Promote MEMBER to SUPERADMIN
    const promoteRes = await request(`/api/super-admin/users/${promoteUser.id}/role`, {
      method: "PUT",
      token: superAdminToken,
      body: { role: "SUPERADMIN" },
    });
    assert.strictEqual(promoteRes.status, 200);
    assert.strictEqual(promoteRes.data.user.role, "SUPERADMIN");
    console.log("✔ Promoted MEMBER to SUPERADMIN successfully");

    // Verify in database directly
    const dbPromoted = await prisma.user.findUnique({ where: { id: promoteUser.id } });
    assert.strictEqual(dbPromoted.role, "SUPERADMIN");
    console.log("✔ Database confirms updated role is SUPERADMIN");

    // Demote to SUBADMIN
    const demoteRes = await request(`/api/super-admin/users/${promoteUser.id}/role`, {
      method: "PUT",
      token: superAdminToken,
      body: { role: "SUBADMIN" },
    });
    assert.strictEqual(demoteRes.status, 200);
    assert.strictEqual(demoteRes.data.user.role, "SUBADMIN");
    console.log("✔ Changed role to SUBADMIN successfully");

    // Invalid role rejection
    const invalidRoleRes = await request(`/api/super-admin/users/${promoteUser.id}/role`, {
      method: "PUT",
      token: superAdminToken,
      body: { role: "INVALID_ROLE" },
    });
    assert.strictEqual(invalidRoleRes.status, 400);
    console.log("✔ Rejected invalid role with 400 Bad Request");

    // Member cannot update roles
    const memberRoleUpdateRes = await request(`/api/super-admin/users/${promoteUser.id}/role`, {
      method: "PUT",
      token: memberToken,
      body: { role: "SUPERADMIN" },
    });
    assert.strictEqual(memberRoleUpdateRes.status, 403);
    console.log("✔ Unauthorized member blocked from updating roles with 403 Forbidden");

    // Step 6: Verify Role Statistics in Database Overview
    console.log("\n--- Step 6: Verifying Role Distribution in Database Overview ---");
    const overviewRes = await request("/api/super-admin/overview", { token: superAdminToken });
    assert.strictEqual(overviewRes.status, 200);
    assert.ok(overviewRes.data.modules.users.byRole, "byRole breakdown present in users overview");
    console.log("Discovered byRole statistics:", overviewRes.data.modules.users.byRole);
    assert.ok(overviewRes.data.modules.users.byRole.SUPERADMIN >= 1);
    assert.ok(overviewRes.data.modules.users.byRole.MEMBER >= 1);
    console.log("✔ byRole counts reflected accurately in Super Admin Overview");

    // Cleanup
    await prisma.staff.deleteMany({ where: { email: { in: testEmails } } });
    await prisma.user.deleteMany({ where: { email: { in: testEmails } } });
    console.log("✔ Cleaned up test records");

    console.log("\n=================================================");
    console.log("   ALL ROLE & SUPERADMIN TESTS PASSED! (6/6)     ");
    console.log("=================================================");
  } finally {
    if (server) {
      server.close();
    }
  }
}

runRoleVerificationTests().catch((err) => {
  console.error("Test failure:", err);
  if (server) server.close();
  process.exit(1);
});
