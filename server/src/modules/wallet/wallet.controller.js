import {
  getVirtualCardDetails,
  creditVirtualCard,
  requestPaymentOtp,
  payWithVirtualCard,
  getMemberTransactions,
} from "./wallet.service.js";

/**
 * GET /api/virtual-card/details
 * GET /api/virtual-card/:identifier
 * Retrieve member's virtual card and current balance.
 */
export const getVirtualCardHandler = async (req, res) => {
  try {
    const identifier = req.params.identifier || req.user?.phone || req.user?.id;
    const card = await getVirtualCardDetails(identifier);
    return res.status(200).json(card);
  } catch (error) {
    console.error("Get virtual card error:", error);
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};

/**
 * POST /api/virtual-card/credit
 * POST /api/wallet/credit
 * Member or Counter Staff adds funds to member's virtual card.
 */
export const creditVirtualCardHandler = async (req, res) => {
  try {
    const phone = req.body.phone || req.user?.phone;
    const { amount, paymentMethod, referenceId, description } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required to credit virtual card" });
    }

    const result = await creditVirtualCard({
      phone,
      amount,
      paymentMethod,
      referenceId,
      description,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Credit virtual card error:", error);
    return res.status(error.statusCode || 400).json({ message: error.message });
  }
};

/**
 * POST /api/virtual-card/request-payment-otp
 * Staff enters member phone + charge amount -> Triggers 6-digit payment OTP to member.
 */
export const requestPaymentOtpHandler = async (req, res) => {
  try {
    const { phone, amount, module } = req.body;
    if (!phone || !amount) {
      return res.status(400).json({ message: "Phone number and amount are required." });
    }

    const result = await requestPaymentOtp({ phone, amount, module });
    return res.status(200).json(result);
  } catch (error) {
    console.error("Request payment OTP error:", error);
    return res.status(error.statusCode || 400).json({ message: error.message });
  }
};

/**
 * POST /api/virtual-card/pay-with-otp
 * Counter staff submits member's phone + OTP to complete payment.
 */
export const payWithVirtualCardHandler = async (req, res) => {
  try {
    const { phone, otp, amount, module, referenceId, description } = req.body;
    if (!phone || !otp || !amount) {
      return res.status(400).json({ message: "Phone, OTP, and amount are required." });
    }

    const result = await payWithVirtualCard({
      phone,
      otp,
      amount,
      module,
      referenceId,
      description,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Pay with virtual card error:", error);
    return res.status(error.statusCode || 400).json({ message: error.message });
  }
};

/**
 * GET /api/virtual-card/transactions
 * Retrieve transaction history.
 */
export const getTransactionsHandler = async (req, res) => {
  try {
    const identifier = req.params.identifier || req.user?.id || req.user?.phone;
    const { page, limit } = req.query;

    const result = await getMemberTransactions(identifier, { page, limit });
    return res.status(200).json(result);
  } catch (error) {
    console.error("Get transactions error:", error);
    return res.status(500).json({ message: error.message });
  }
};
