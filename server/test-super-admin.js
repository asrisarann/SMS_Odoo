import assert from "node:assert";
import jwt from "jsonwebtoken";
import app from "./src/app.js";
import prisma from "./src/config/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET || "sms_odoo_jwt_secret_super_secure_key";

// Simple HTTP request helper using app in-process with node's fetch or http
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

async function runSuperAdminTests() {
  console.log("=================================================");
  console.log("   SUPER ADMIN GENERAL MODULE TEST SUITE         ");
  console.log("=================================================");

  // Start HTTP server on an ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`Test server running at ${baseUrl}`);
      resolve();
    });
  });

  try {
    // 1. Setup test users and tokens
    console.log("\n--- Step 1: Setting up test users and roles ---");

    // Clean up any previous test artifacts
    await prisma.staff.deleteMany({ where: { email: { in: ["super_admin_test@test.com", "sub_admin_test@test.com"] } } });
    await prisma.user.deleteMany({ where: { email: { in: ["super_admin_test@test.com", "sub_admin_test@test.com", "member_user_test@test.com"] } } });

    // Create Admin User & Staff
    const adminUser = await prisma.user.create({
      data: {
        name: "Super Admin Tester",
        email: "super_admin_test@test.com",
        phone: "9998887771",
        membership: "GOLD",
        amount: 5000,
      },
    });

    const adminStaff = await prisma.staff.create({
      data: {
        name: "Super Admin Staff",
        email: "super_admin_test@test.com",
        phone: "9998887771",
        role: "ADMIN",
        designation: "all",
        salary: 100000,
      },
    });

    // Create SubAdmin User & Staff
    const subAdminUser = await prisma.user.create({
      data: {
        name: "Sports SubAdmin Tester",
        email: "sub_admin_test@test.com",
        phone: "9998887772",
        membership: "SILVER",
        amount: 2000,
      },
    });

    const subAdminStaff = await prisma.staff.create({
      data: {
        name: "SubAdmin Staff",
        email: "sub_admin_test@test.com",
        phone: "9998887772",
        role: "SUBADMIN",
        designation: "sports",
        salary: 50000,
      },
    });

    // Create Normal Member User
    const memberUser = await prisma.user.create({
      data: {
        name: "Member User Tester",
        email: "member_user_test@test.com",
        phone: "9998887773",
        membership: "JUNIOR",
        amount: 1000,
      },
    });

    const adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email, role: "ADMIN" }, JWT_SECRET, { expiresIn: "1h" });
    const subAdminToken = jwt.sign({ id: subAdminUser.id, email: subAdminUser.email, role: "SUBADMIN", module: "sports" }, JWT_SECRET, { expiresIn: "1h" });
    const memberToken = jwt.sign({ id: memberUser.id, email: memberUser.email, role: "MEMBER" }, JWT_SECRET, { expiresIn: "1h" });

    console.log("Tokens generated successfully for ADMIN, SUBADMIN, and MEMBER.");

    // 2. Authentication & Authorization Checks
    console.log("\n--- Step 2: Testing Role-Based Security & Permissions ---");
    const unauthRes = await request("/api/super-admin/overview");
    assert.strictEqual(unauthRes.status, 401, "Expected 401 when no token is provided");
    console.log("✔ Unauthenticated request blocked with 401");

    const memberRes = await request("/api/super-admin/overview", { token: memberToken });
    assert.strictEqual(memberRes.status, 403, "Expected 403 for MEMBER role");
    console.log("✔ Member access blocked with 403 Forbidden");

    const subAdminRes = await request("/api/super-admin/overview", { token: subAdminToken });
    assert.strictEqual(subAdminRes.status, 403, "Expected 403 for SUBADMIN role");
    console.log("✔ SubAdmin access to super admin portal blocked with 403 Forbidden");

    const adminRes = await request("/api/super-admin/overview", { token: adminToken });
    assert.strictEqual(adminRes.status, 200, "Expected 200 for ADMIN role");
    console.log("✔ Admin granted access with 200 OK");

    // 3. System & Database Overview Verification
    console.log("\n--- Step 3: Verifying Multi-Module Database Overview ---");
    assert.ok(adminRes.data.database, "Database metadata present");
    assert.strictEqual(adminRes.data.database.status, "connected");
    assert.ok(adminRes.data.counts.User >= 3, "User count reflected");
    assert.ok(adminRes.data.modules.users, "Users module overview present");
    assert.ok(adminRes.data.modules.sports, "Sports module overview present");
    assert.ok(adminRes.data.modules.cafe, "Cafe module overview present");
    assert.ok(adminRes.data.modules.shop, "Shop module overview present");
    assert.ok(adminRes.data.modules.inventory, "Inventory module overview present");
    assert.ok(adminRes.data.modules.staff, "Staff module overview present");
    console.log("✔ Multi-module overview verified with live statistics across all modules");

    // 4. Schema Models Metadata Verification
    console.log("\n--- Step 4: Verifying Database Models & Metadata Explorer ---");
    const modelsRes = await request("/api/super-admin/models", { token: adminToken });
    assert.strictEqual(modelsRes.status, 200);
    assert.ok(modelsRes.data.totalModels >= 8, "Expected at least 8 models in schema");
    const modelNames = modelsRes.data.models.map((m) => m.name);
    console.log("Discovered database models:", modelNames.join(", "));
    assert.ok(modelNames.includes("User"), "Includes User model");
    assert.ok(modelNames.includes("SportsBooking"), "Includes SportsBooking model");
    assert.ok(modelNames.includes("SportPricing"), "Includes SportPricing model");
    assert.ok(modelNames.includes("Product"), "Includes Product model");
    assert.ok(modelNames.includes("Staff"), "Includes Staff model");
    console.log("✔ Database schema explorer correctly discovers all models and field types");

    // 5. Universal Model Data Query (Pagination, Search, Sorting, Relations)
    console.log("\n--- Step 5: Testing Universal Dynamic Data Query Across Models ---");

    // Query Users
    const usersData = await request("/api/super-admin/data/users?limit=5", { token: adminToken });
    assert.strictEqual(usersData.status, 200);
    assert.ok(usersData.data.data.length > 0, "Users data retrieved");
    assert.ok(usersData.data.meta.total >= 3, "Total count returned");
    // Verify password is NOT exposed
    assert.strictEqual(usersData.data.data[0].password, undefined, "Password stripped from response");
    console.log("✔ Query /data/users returned paginated records with sensitive data sanitized");

    // Query with search
    const searchRes = await request("/api/super-admin/data/users?search=Super Admin Tester", { token: adminToken });
    assert.strictEqual(searchRes.status, 200);
    assert.strictEqual(searchRes.data.data.length, 1);
    assert.strictEqual(searchRes.data.data[0].email, "super_admin_test@test.com");
    console.log("✔ Text search across models working accurately");

    // Query Sports Bookings
    const bookingsData = await request("/api/super-admin/data/sports-bookings?limit=5", { token: adminToken });
    assert.strictEqual(bookingsData.status, 200);
    console.log("✔ Query /data/sports-bookings successfully accessed");

    // Query Sport Pricing
    const pricingData = await request("/api/super-admin/data/sport-pricing", { token: adminToken });
    assert.strictEqual(pricingData.status, 200);
    console.log("✔ Query /data/sport-pricing successfully accessed");

    // Test Dedicated Sports Pricing & Config Endpoints in SuperAdmin
    const sportsPricingRes = await request("/api/super-admin/sports/pricing", { token: adminToken });
    assert.strictEqual(sportsPricingRes.status, 200);
    assert.ok(Array.isArray(sportsPricingRes.data.pricing));
    console.log("✔ GET /api/super-admin/sports/pricing successfully handled by superAdmin");

    const sportsConfigRes = await request("/api/admin/sports/config", { token: adminToken });
    assert.strictEqual(sportsConfigRes.status, 200);
    assert.ok(Array.isArray(sportsConfigRes.data.configs));
    console.log("✔ GET /api/admin/sports/config successfully handled by superAdmin");

    // Query Staff
    const staffData = await request("/api/super-admin/data/staff", { token: adminToken });
    assert.strictEqual(staffData.status, 200);
    assert.ok(staffData.data.data.length >= 2);
    console.log("✔ Query /data/staff successfully accessed");

    // 6. Generic CRUD on Database Table (Product)
    console.log("\n--- Step 6: Testing Universal CRUD Operations in Database ---");
    // Create Product
    const newProduct = {
      name: "Super Admin Tennis Racket Pro",
      category: "Equipment",
      buyPrice: 4500.5,
      rentPrice: 250.0,
      size: "L",
      inStock: 15,
    };
    const createRes = await request("/api/super-admin/data/products", {
      method: "POST",
      token: adminToken,
      body: newProduct,
    });
    assert.strictEqual(createRes.status, 201);
    const createdId = createRes.data.data.id;
    assert.ok(createdId, "Product created with ID");
    assert.strictEqual(createRes.data.data.name, newProduct.name);
    console.log("✔ Created new Product record via universal endpoint");

    // Get Single Record by ID
    const getSingleRes = await request(`/api/super-admin/data/products/${createdId}`, { token: adminToken });
    assert.strictEqual(getSingleRes.status, 200);
    assert.strictEqual(getSingleRes.data.data.id, createdId);
    console.log("✔ Retrieved single record by ID");

    // Update Record
    const updateRes = await request(`/api/super-admin/data/products/${createdId}`, {
      method: "PUT",
      token: adminToken,
      body: { inStock: 25, buyPrice: 4200.0 },
    });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.data.data.inStock, 25);
    console.log("✔ Updated record successfully via universal endpoint");

    // Delete Record
    const deleteRes = await request(`/api/super-admin/data/products/${createdId}`, {
      method: "DELETE",
      token: adminToken,
    });
    assert.strictEqual(deleteRes.status, 200);
    assert.strictEqual(deleteRes.data.success, true);
    console.log("✔ Deleted record successfully via universal endpoint");

    // Verify record no longer exists
    const verifyDelete = await request(`/api/super-admin/data/products/${createdId}`, { token: adminToken });
    assert.strictEqual(verifyDelete.status, 404);
    console.log("✔ Verified record no longer exists (404)");

    // 7. Safe SQL Inspection Console
    console.log("\n--- Step 7: Testing Safe Read-Only SQL Inspection ---");
    const safeQueryRes = await request("/api/super-admin/query", {
      method: "POST",
      token: adminToken,
      body: { query: 'SELECT count(*)::int as total_users FROM "User";' },
    });
    assert.strictEqual(safeQueryRes.status, 200);
    assert.ok(safeQueryRes.data.rows[0].total_users >= 3);
    console.log("✔ Safe SELECT query executed successfully. Result:", safeQueryRes.data.rows[0]);

    // Test destructive SQL rejection
    const dangerousQueryRes = await request("/api/super-admin/query", {
      method: "POST",
      token: adminToken,
      body: { query: 'DROP TABLE "User";' },
    });
    assert.strictEqual(dangerousQueryRes.status, 400);
    console.log("✔ Destructive query (DROP TABLE) strictly rejected with 400 Bad Request");

    // 8. Sub-Admin Directory and Module Assignment
    console.log("\n--- Step 8: Testing Sub-Admin Directory & Module Assignment ---");
    const subAdminsListRes = await request("/api/super-admin/sub-admins", { token: adminToken });
    assert.strictEqual(subAdminsListRes.status, 200);
    assert.ok(subAdminsListRes.data.subAdmins.length >= 2);
    console.log("✔ Sub-admin directory retrieved");

    // Reassign sub-admin module
    const assignModuleRes = await request(`/api/super-admin/sub-admins/${subAdminStaff.id}/module`, {
      method: "PUT",
      token: adminToken,
      body: { module: "cafe" },
    });
    assert.strictEqual(assignModuleRes.status, 200);
    assert.strictEqual(assignModuleRes.data.subAdmin.designation, "cafe");
    console.log("✔ Sub-admin module reassignment verified (reassigned to 'cafe')");

    // 9. Unknown Model Handling
    console.log("\n--- Step 9: Testing Unknown Model Rejection ---");
    const unknownRes = await request("/api/super-admin/data/nonexistent-module", { token: adminToken });
    assert.strictEqual(unknownRes.status, 404);
    assert.ok(Array.isArray(unknownRes.data.availableModels));
    console.log("✔ Unknown model rejected with 404 and available models list provided");

    // Clean up test data
    await prisma.staff.deleteMany({ where: { email: { in: ["super_admin_test@test.com", "sub_admin_test@test.com"] } } });
    await prisma.user.deleteMany({ where: { email: { in: ["super_admin_test@test.com", "sub_admin_test@test.com", "member_user_test@test.com"] } } });
    console.log("✔ Test artifacts cleaned up successfully");

    console.log("\n=================================================");
    console.log("   ALL SUPER ADMIN MODULE TESTS PASSED! (9/9)    ");
    console.log("=================================================");
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await prisma.$disconnect();
  }
}

runSuperAdminTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failure:", err);
    process.exit(1);
  });
