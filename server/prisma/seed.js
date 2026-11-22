import crypto from "node:crypto";
import bcrypt from "bcrypt";
import prisma from "../src/config/prisma.js";

const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
  "Shaurya", "Atharva", "Advik", "Pranav", "Advaith", "Aaryan", "Dhruv", "Kabir", "Ritvik", "Darsh",
  "Ananya", "Diya", "Saanvi", "Aadhya", "Pari", "Kiara", "Myra", "Riya", "Aarohi", "Anushka",
  "Isha", "Navya", "Avani", "Tanvi", "Shanaya", "Sneha", "Kavya", "Meera", "Tara", "Roshni",
  "Vikram", "Rohan", "Rahul", "Sameer", "Karan", "Nikhil", "Amit", "Suresh", "Manish", "Gaurav",
  "Pooja", "Neha", "Divya", "Swati", "Shreya", "Simran", "Deepika", "Kritika", "Preeti", "Sunita",
  "Dev", "Kunal", "Rajesh", "Varun", "Abhishek", "Harsh", "Yash", "Mohit", "Chirag", "Alok"
];

const LAST_NAMES = [
  "Sharma", "Verma", "Patel", "Gupta", "Nair", "Iyer", "Reddy", "Mehta", "Joshi", "Chopra",
  "Malhotra", "Kapoor", "Bhatia", "Saxena", "Agarwal", "Bansal", "Mishra", "Pandey", "Trivedi", "Deshmukh",
  "Kulkarni", "Patil", "Rao", "Menon", "Pillai", "Das", "Mukherjee", "Chatterjee", "Sen", "Ghosh",
  "Singh", "Kaur", "Chauhan", "Yadav", "Thakur", "Rathore", "Bose", "Dutta", "Nath", "Venkatesh",
  "Bhardwaj", "Aggarwal", "Soni", "Chaudhary", "Shukla", "Garg", "Mahajan", "Sarin", "Bhatt", "Purohit"
];

const WALLET_AMOUNTS = [
  0.0, 150.0, 300.0, 500.0, 750.0, 1000.0, 1250.0, 1500.0, 2000.0, 2500.0, 3500.0, 5000.0, 7500.0, 10000.0
];

/**
 * Generates an array of 500 dummy user records with realistic data.
 */
export async function generateSeedUsers(count = 500) {
  console.log(`Pre-hashing default password for seed users...`);
  // All seed users share the standard test password "Password@123"
  const defaultPasswordHash = await bcrypt.hash("Password@123", 10);

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const users = [];

  for (let i = 0; i < count; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
    const fullName = `${firstName} ${lastName}`;
    const userIndex = i + 1;

    // Guaranteed unique email & phone
    const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, "");
    const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, "");
    const email = `${cleanFirst}.${cleanLast}.${userIndex}@smsclub.com`;
    const phone = `98${String(10000000 + userIndex).padStart(8, "0")}`;

    // Realistic Role distribution:
    // User 1-2: SUPERADMIN
    // User 3-10: SUBADMIN
    // User 11-25: STAFF
    // Remaining (26-500): MEMBER
    let role = "MEMBER";
    if (userIndex <= 2) {
      role = "SUPERADMIN";
    } else if (userIndex <= 10) {
      role = "SUBADMIN";
    } else if (userIndex <= 25) {
      role = "STAFF";
    }

    // Realistic Membership distribution:
    // ~45% GOLD, ~40% SILVER, ~15% JUNIOR
    let membership;
    let pastMembership = [];
    const membershipRoll = i % 20;
    if (membershipRoll < 9) {
      membership = "GOLD";
      pastMembership = i % 2 === 0 ? ["SILVER"] : (i % 3 === 0 ? ["JUNIOR"] : []);
    } else if (membershipRoll < 17) {
      membership = "SILVER";
      pastMembership = i % 3 === 0 ? ["JUNIOR"] : [];
    } else {
      membership = "JUNIOR";
      pastMembership = [];
    }

    // Realistic Renewal Dates:
    // ~30 users expiring soon (in 1 to 3 days) -> useful for reminder triggers
    // ~70 users expiring this month (in 4 to 30 days)
    // ~350 users active for 2 to 12 months ahead
    // ~50 users with expired memberships (10 to 90 days ago)
    let renewalDate;
    if (i < 30) {
      // 1 to 3 days in the future
      const daysAhead = 1 + (i % 3);
      renewalDate = new Date(now + daysAhead * DAY_MS);
    } else if (i < 100) {
      // 4 to 30 days in the future
      const daysAhead = 4 + (i % 27);
      renewalDate = new Date(now + daysAhead * DAY_MS);
    } else if (i < 450) {
      // 31 to 365 days in the future
      const daysAhead = 31 + ((i * 7) % 335);
      renewalDate = new Date(now + daysAhead * DAY_MS);
    } else {
      // Expired in the past (10 to 90 days ago)
      const daysAgo = 10 + (i % 80);
      renewalDate = new Date(now - daysAgo * DAY_MS);
    }

    // Last Entry scan: ~80% visited recently (1-30 days ago), ~20% null
    let lastEntry = null;
    if (i % 5 !== 0) {
      const entryDaysAgo = (i % 30) + 1;
      lastEntry = new Date(now - entryDaysAgo * DAY_MS);
    }

    // Wallet balance
    const amount = WALLET_AMOUNTS[i % WALLET_AMOUNTS.length];

    users.push({
      id: crypto.randomUUID(),
      name: fullName,
      phone,
      email,
      role,
      membership,
      pastMembership,
      renewalDate,
      lastReminderSent: null,
      lastEntry,
      amount,
      password: defaultPasswordHash,
    });
  }

  return users;
}

/**
 * Executes the database seed for 500 users in chunks.
 */
export async function seedDatabase(count = 500) {
  console.log("=================================================");
  console.log(`   SEEDING ${count} DUMMY USERS INTO NEON POSTGRES`);
  console.log("=================================================");

  const initialCount = await prisma.user.count();
  console.log(`Current existing users in database: ${initialCount}`);

  const users = await generateSeedUsers(count);
  const CHUNK_SIZE = 100;
  let insertedTotal = 0;

  for (let i = 0; i < users.length; i += CHUNK_SIZE) {
    const chunk = users.slice(i, i + CHUNK_SIZE);
    const batchNumber = Math.floor(i / CHUNK_SIZE) + 1;
    const totalBatches = Math.ceil(users.length / CHUNK_SIZE);

    console.log(`Inserting batch ${batchNumber}/${totalBatches} (users ${i + 1} to ${i + chunk.length})...`);
    const result = await prisma.user.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    insertedTotal += result.count;
  }

  const finalCount = await prisma.user.count();
  console.log(`\n✔ Successfully inserted ${insertedTotal} seed users.`);
  console.log(`Total users in database now: ${finalCount}`);

  // Query breakdown of database users
  const roleBreakdown = await prisma.user.groupBy({
    by: ["role"],
    _count: { _all: true },
  });

  const membershipBreakdown = await prisma.user.groupBy({
    by: ["membership"],
    _count: { _all: true },
  });

  console.log("\n--- Current Users by Role ---");
  for (const r of roleBreakdown) {
    console.log(`  ${r.role}: ${r._count._all}`);
  }

  console.log("\n--- Current Users by Membership ---");
  for (const m of membershipBreakdown) {
    console.log(`  ${m.membership}: ${m._count._all}`);
  }

  console.log("\nSeed credentials note: All seed users are configured with password 'Password@123'.");
  console.log("=================================================");
  return { insertedTotal, finalCount };
}

// Self-invoking when run as CLI
if (process.argv[1]?.endsWith("seed.js")) {
  seedDatabase(500)
    .then(() => {
      console.log("Seeding process completed successfully.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed with error:", error);
      process.exit(1);
    });
}
