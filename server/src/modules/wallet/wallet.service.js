import prisma from "../../config/prisma.js";
import { sendEmail, generateOtp } from "../../common/utils/mailer.js";

// In-memory payment OTP store with TTL (5 minutes)
// Key: phone, Value: { otp, amount, module, expiresAt }
export const paymentOtpStore = new Map();

/**
 * 1. Get Virtual Card details by Phone Number or User ID.
 * The member's unique phone number serves as their Virtual Card identifier.
 */
export const getVirtualCardDetails = async (identifier) => {
  if (!identifier) {
    throw new Error("Phone number or User ID is required");
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id: identifier }, { phone: identifier }],
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      membership: true,
      amount: true,
      renewalDate: true,
      lastEntry: true,
      walletTransactions: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!user) {
    const error = new Error(`Virtual card not found for '${identifier}'`);
    error.statusCode = 404;
    throw error;
  }

  return {
    virtualCard: {
      cardNumber: user.phone, // Member's unique phone number is the virtual card number
      cardHolder: user.name,
      membershipTier: user.membership,
      balance: Number(user.amount),
      status: "ACTIVE",
      qrPayload: `CHAMPIONS-CLUB:${user.phone}:${user.id}`,
    },
    profile: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
    },
    recentTransactions: user.walletTransactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount),
      balanceAfter: Number(tx.balanceAfter),
      paymentMethod: tx.paymentMethod,
      module: tx.module,
      description: tx.description,
      createdAt: tx.createdAt,
    })),
  };
};

/**
 * 2. Credit / Top-up amount to member's Virtual Card.
 * As per PRD: "a member can credit the amount and add the amount to their virtual card.
 * Using their unique phone number, they can pay anywhere in the club so there is no need for UPI, cash, and other cards."
 */
export const creditVirtualCard = async ({
  phone,
  amount,
  paymentMethod = "UPI",
  referenceId,
  description,
}) => {
  const depositAmount = Number(amount);
  if (isNaN(depositAmount) || depositAmount <= 0) {
    const error = new Error("Top-up amount must be a positive number.");
    error.statusCode = 400;
    throw error;
  }

  const validMethods = ["UPI", "CARD", "CASH", "ONLINE", "VIRTUAL_CARD"];
  const method = (paymentMethod || "UPI").toUpperCase();
  if (!validMethods.includes(method)) {
    const error = new Error(`Invalid payment method. Allowed: ${validMethods.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { phone: phone.trim() },
  });

  if (!user) {
    const error = new Error(`User not found with phone '${phone}'`);
    error.statusCode = 404;
    throw error;
  }

  // Atomic database transaction to update balance and record transaction history
  const result = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: {
        amount: {
          increment: depositAmount,
        },
      },
    });

    const newBalance = Number(updatedUser.amount);

    const transaction = await tx.walletTransaction.create({
      data: {
        userID: user.id,
        phone: user.phone,
        type: "CREDIT",
        amount: depositAmount,
        balanceAfter: newBalance,
        paymentMethod: method,
        module: "WALLET_TOPUP",
        referenceId: referenceId || null,
        description: description || `Virtual Card Top-up via ${method}`,
      },
    });

    return {
      user: updatedUser,
      transaction,
      balance: newBalance,
    };
  });

  // Send top-up receipt email
  await sendEmail({
    to: user.email,
    subject: `Virtual Card Credited: ₹${depositAmount} added to your Champions Club Card`,
    text: `Hello ${user.name},\n\nYour Champions Club Virtual Card (${user.phone}) has been credited with ₹${depositAmount} via ${method}.\n\nYour new wallet balance is ₹${result.balance}.\n\nYou can now use your phone number and OTP to pay seamlessly at our Courts, Gear Shop, and Bar & Cafeteria.\n\nThank you,\nThe Champions Club`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0f766e; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 22px;">Virtual Card Top-Up Successful</h2>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 16px;">Dear <strong>${user.name}</strong>,</p>
          <p>Your Virtual Club Card balance has been credited successfully.</p>
          <div style="background-color: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Card Number (Phone):</strong> ${user.phone}</p>
            <p style="margin: 4px 0;"><strong>Amount Credited:</strong> +₹${depositAmount.toFixed(2)}</p>
            <p style="margin: 4px 0;"><strong>Payment Inflow Mode:</strong> ${method}</p>
            <p style="margin: 4px 0; font-size: 18px; color: #0f766e;"><strong>New Available Balance:</strong> ₹${result.balance.toFixed(2)}</p>
          </div>
          <p>Present your phone number anywhere in the club to make instant cardless payments.</p>
          <p>Warm regards,<br><strong>The Champions Club</strong></p>
        </div>
      </div>
    `,
  });

  return {
    message: `Virtual card credited successfully with ₹${depositAmount}.`,
    cardNumber: user.phone,
    newBalance: result.balance,
    transaction: {
      id: result.transaction.id,
      amount: depositAmount,
      balanceAfter: result.balance,
      paymentMethod: method,
      createdAt: result.transaction.createdAt,
    },
  };
};

/**
 * 3. Request Payment OTP for POS/Counter transactions.
 * When member purchases at Shop, Bar, or Courts:
 * Staff enters phone number + charge amount -> System verifies balance and dispatches 6-digit OTP.
 */
export const requestPaymentOtp = async ({ phone, amount, module = "SHOP" }) => {
  const chargeAmount = Number(amount);
  if (isNaN(chargeAmount) || chargeAmount <= 0) {
    const error = new Error("Payment amount must be a positive number.");
    error.statusCode = 400;
    throw error;
  }

  const cleanPhone = (phone || "").trim();
  const user = await prisma.user.findUnique({
    where: { phone: cleanPhone },
  });

  if (!user) {
    const error = new Error(`Virtual card not registered for phone '${phone}'`);
    error.statusCode = 404;
    throw error;
  }

  const currentBalance = Number(user.amount);
  if (currentBalance < chargeAmount) {
    const error = new Error(
      `Insufficient virtual card balance. Required: ₹${chargeAmount.toFixed(2)}, Available: ₹${currentBalance.toFixed(2)}. Please credit your virtual card.`
    );
    error.statusCode = 400;
    throw error;
  }

  // Generate 6-digit OTP and store with 5-minute TTL
  const otp = generateOtp();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  paymentOtpStore.set(cleanPhone, {
    otp,
    amount: chargeAmount,
    module: module.toUpperCase(),
    expiresAt,
    userId: user.id,
  });

  // Dispatch OTP notification to member
  await sendEmail({
    to: user.email,
    subject: `Payment OTP: ₹${chargeAmount} at Champions Club ${module}`,
    text: `Hello ${user.name},\n\nYour payment OTP for ₹${chargeAmount} at ${module} is: ${otp}\n\nThis OTP is valid for 5 minutes. Do not share this code with anyone other than the club counter staff.\n\nThank you,\nThe Champions Club`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #1e3a8a; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 22px;">Club Payment Verification</h2>
        </div>
        <div style="padding: 24px; text-align: center;">
          <p style="font-size: 16px;">Dear <strong>${user.name}</strong>,</p>
          <p>You are authorizing a virtual card payment of <strong>₹${chargeAmount.toFixed(2)}</strong> at <strong>${module}</strong>.</p>
          
          <div style="background-color: #eff6ff; border: 1px dashed #3b82f6; border-radius: 8px; padding: 18px; margin: 20px auto; width: 220px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1d4ed8;">${otp}</span>
          </div>

          <p style="font-size: 13px; color: #64748b;">This OTP expires in 5 minutes. Share this OTP with the staff to complete your payment.</p>
        </div>
      </div>
    `,
  });

  // Mask email for privacy (e.g. j***@domain.com)
  const parts = user.email.split("@");
  const maskedEmail = `${parts[0].slice(0, 2)}***@${parts[1]}`;

  return {
    message: `Payment OTP sent to registered email (${maskedEmail})`,
    phone: cleanPhone,
    amount: chargeAmount,
    module: module.toUpperCase(),
    expiresInSeconds: 300,
    devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
  };
};

/**
 * 4. Process Payment with Virtual Card using Phone + OTP.
 * Deducts amount from User.amount, logs transaction as VIRTUAL_CARD, and returns receipt.
 */
export const payWithVirtualCard = async ({
  phone,
  otp,
  amount,
  module = "SHOP",
  referenceId,
  description,
}) => {
  const cleanPhone = (phone || "").trim();
  const cleanOtp = (otp || "").trim();
  const chargeAmount = Number(amount);

  const pending = paymentOtpStore.get(cleanPhone);
  if (!pending) {
    const error = new Error("No active payment OTP found. Please request a new OTP.");
    error.statusCode = 400;
    throw error;
  }

  if (Date.now() > pending.expiresAt) {
    paymentOtpStore.delete(cleanPhone);
    const error = new Error("Payment OTP has expired. Please request a new OTP.");
    error.statusCode = 400;
    throw error;
  }

  if (pending.otp !== cleanOtp) {
    const error = new Error("Invalid payment OTP. Please check the code and try again.");
    error.statusCode = 400;
    throw error;
  }

  const validModules = ["SHOP", "CAFE", "COURT", "WALLET_TOPUP", "MEMBERSHIP"];
  const targetModule = (module || pending.module || "SHOP").toUpperCase();
  const normalizedModule = validModules.includes(targetModule) ? targetModule : "SHOP";

  // Atomic database transaction to lock user row, verify balance, and deduct
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { phone: cleanPhone },
    });

    if (!user) {
      throw new Error("User record not found");
    }

    const currentBalance = Number(user.amount);
    if (currentBalance < chargeAmount) {
      throw new Error(
        `Insufficient balance. Required: ₹${chargeAmount.toFixed(2)}, Available: ₹${currentBalance.toFixed(2)}.`
      );
    }

    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: {
        amount: {
          decrement: chargeAmount,
        },
      },
    });

    const newBalance = Number(updatedUser.amount);

    const txRecord = await tx.walletTransaction.create({
      data: {
        userID: user.id,
        phone: user.phone,
        type: "DEBIT",
        amount: chargeAmount,
        balanceAfter: newBalance,
        paymentMethod: "VIRTUAL_CARD",
        module: normalizedModule,
        referenceId: referenceId || null,
        description: description || `Payment at ${normalizedModule} via Virtual Card`,
      },
    });

    return {
      user: updatedUser,
      transaction: txRecord,
      newBalance,
    };
  });

  // Invalidate OTP after successful consumption
  paymentOtpStore.delete(cleanPhone);

  // Send confirmation email
  await sendEmail({
    to: result.user.email,
    subject: `Payment Successful: ₹${chargeAmount} at Champions Club ${normalizedModule}`,
    text: `Hello ${result.user.name},\n\nPayment of ₹${chargeAmount} at ${normalizedModule} has been processed successfully using your Virtual Card (${cleanPhone}).\n\nRemaining Balance: ₹${result.newBalance.toFixed(2)}\nTransaction Ref: ${result.transaction.id}\n\nThank you,\nThe Champions Club`,
  });

  return {
    success: true,
    message: "Payment successful via Virtual Card.",
    paymentMethod: "VIRTUAL_CARD",
    amountPaid: chargeAmount,
    remainingBalance: result.newBalance,
    transactionId: result.transaction.id,
    module: normalizedModule,
    timestamp: result.transaction.createdAt,
  };
};

/**
 * 5. Get member's wallet transaction history.
 */
export const getMemberTransactions = async (phoneOrUserId, { page = 1, limit = 20 } = {}) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.max(1, parseInt(limit, 10) || 20);
  const skip = (p - 1) * l;

  const where = {
    OR: [{ userID: phoneOrUserId }, { phone: phoneOrUserId }],
  };

  const [transactions, totalCount] = await Promise.all([
    prisma.walletTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: l,
    }),
    prisma.walletTransaction.count({ where }),
  ]);

  return {
    totalCount,
    totalPages: Math.ceil(totalCount / l) || 1,
    currentPage: p,
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      balanceAfter: Number(t.balanceAfter),
      paymentMethod: t.paymentMethod,
      module: t.module,
      description: t.description,
      createdAt: t.createdAt,
    })),
  };
};
