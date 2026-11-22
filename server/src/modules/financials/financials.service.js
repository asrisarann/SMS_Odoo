import prisma from "../../config/prisma.js";
import { parseKolkataToUTC } from "../sports/utils/slot.utils.js";

/**
 * Calculates start and end timestamps for a requested period in Asia/Kolkata timezone.
 *
 * @param {'today' | 'this_week' | 'this_month' | 'custom'} period
 * @param {string} [startDate] - YYYY-MM-DD
 * @param {string} [endDate] - YYYY-MM-DD
 * @returns {{ start: Date, end: Date, label: string, periodDays: number }}
 */
export const resolvePeriodWindow = (period = "today", startDate, endDate) => {
  const now = new Date();
  // Get current Kolkata date strings
  const kolkataNow = new Date(now.getTime() + 330 * 60 * 1000);
  const year = kolkataNow.getUTCFullYear();
  const month = kolkataNow.getUTCMonth(); // 0-indexed
  const dateNum = kolkataNow.getUTCDate();
  const dayOfWeek = kolkataNow.getUTCDay(); // 0 is Sunday, 1 is Monday

  let start;
  let end;
  let label;
  let periodDays = 1;

  if (period === "this_week") {
    // Week starts on Monday (1). If Sunday (0), go back 6 days.
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const mondayDate = new Date(Date.UTC(year, month, dateNum - diffToMonday));
    const mondayStr = mondayDate.toISOString().split("T")[0];

    start = parseKolkataToUTC(mondayStr, "00:00");
    end = new Date(now.getTime() + 24 * 60 * 60 * 1000); // through end of current day
    label = `This Week (Since Monday ${mondayStr})`;
    periodDays = Math.max(1, diffToMonday + 1);
  } else if (period === "this_month") {
    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    start = parseKolkataToUTC(monthStr, "00:00");
    end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    label = `This Month (${new Date(year, month, 1).toLocaleString("en-US", { month: "long" })} ${year})`;
    periodDays = Math.max(1, dateNum);
  } else if (period === "custom" && startDate && endDate) {
    start = parseKolkataToUTC(startDate, "00:00");
    end = parseKolkataToUTC(endDate, "23:59");
    label = `Custom Period (${startDate} to ${endDate})`;
    periodDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
  } else {
    // Default: 'today'
    const todayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dateNum).padStart(2, "0")}`;
    start = parseKolkataToUTC(todayStr, "00:00");
    end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    label = `Today (${todayStr})`;
    periodDays = 1;
  }

  return { start, end, label, periodDays };
};

/**
 * Generates Executive Consolidated Financial Report.
 * Answers the owner's core questions (PRD Scene 6):
 * 1. "How much did we earn?" (Consolidated across Courts, Gear Shop, and Bar & Cafeteria).
 * 2. "From where?" (Detailed revenue breakdown by department/stream).
 * 3. "By which payment method?" (Virtual Card, Cash, Card, UPI, Online).
 * 4. "What do we owe?" (Staff payroll liability and outstanding member balances).
 *
 * @param {Object} options
 * @param {'today' | 'this_week' | 'this_month' | 'custom'} [options.period='today']
 * @param {string} [options.startDate]
 * @param {string} [options.endDate]
 */
export const getExecutiveFinancialReport = async ({ period = "today", startDate, endDate } = {}) => {
  const { start, end, label, periodDays } = resolvePeriodWindow(period, startDate, endDate);

  // 1. Courts Booking Revenue
  const courtsAgg = await prisma.sportsBooking.aggregate({
    where: {
      status: "CONFIRMED",
      createdAt: { gte: start, lte: end },
    },
    _sum: { totalAmount: true },
    _count: { id: true },
  });
  const courtsRevenue = Number(courtsAgg._sum.totalAmount || 0);
  const courtsBookingsCount = courtsAgg._count.id || 0;

  // Breakdown by Sport
  const courtsBySport = await prisma.sportsBooking.groupBy({
    by: ["whichCourt"],
    where: {
      status: "CONFIRMED",
      createdAt: { gte: start, lte: end },
    },
    _sum: { totalAmount: true },
    _count: { id: true },
  });

  // 2. Sports Gear Shop & Equipment Stringing Revenue
  const shopAgg = await prisma.sportShopPurchase.aggregate({
    where: {
      status: { not: "CANCELLED" },
      purchaseDate: { gte: start, lte: end },
    },
    _sum: { totalAmount: true, discount: true },
    _count: { id: true },
  });
  const shopSalesRevenue = Number(shopAgg._sum.totalAmount || 0);
  const shopDiscountsGiven = Number(shopAgg._sum.discount || 0);
  const shopPurchasesCount = shopAgg._count.id || 0;

  const stringingAgg = await prisma.racketStringing.aggregate({
    where: {
      status: { not: "CANCELLED" },
      createdAt: { gte: start, lte: end },
    },
    _sum: { price: true },
    _count: { id: true },
  });
  const stringingRevenue = Number(stringingAgg._sum.price || 0);
  const stringingJobsCount = stringingAgg._count.id || 0;

  const shopRevenue = shopSalesRevenue + stringingRevenue;

  // 3. Bar & Cafeteria Revenue
  const cafeAgg = await prisma.cafeOrder.aggregate({
    where: {
      dateTime: { gte: start, lte: end },
    },
    _sum: { totalAmount: true },
    _count: { id: true },
  });
  const cafeRevenue = Number(cafeAgg._sum.totalAmount || 0);
  const cafeOrdersCount = cafeAgg._count.id || 0;

  // 4. Virtual Card Top-Ups (Club wallet inflows)
  const walletCreditsAgg = await prisma.walletTransaction.aggregate({
    where: {
      type: "CREDIT",
      createdAt: { gte: start, lte: end },
    },
    _sum: { amount: true },
    _count: { id: true },
  });
  const walletTopupsInflow = Number(walletCreditsAgg._sum.amount || 0);
  const walletTopupsCount = walletCreditsAgg._count.id || 0;

  // 5. Payment Methods Breakdown (from Wallet Transactions & direct payments)
  const paymentsByMethod = await prisma.walletTransaction.groupBy({
    by: ["paymentMethod"],
    where: {
      createdAt: { gte: start, lte: end },
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  const paymentBreakdown = {
    VIRTUAL_CARD: 0,
    CASH: 0,
    CARD: 0,
    UPI: 0,
    ONLINE: 0,
  };

  for (const pm of paymentsByMethod) {
    if (paymentBreakdown[pm.paymentMethod] !== undefined) {
      paymentBreakdown[pm.paymentMethod] = Number(pm._sum.amount || 0);
    }
  }

  // Consolidated Gross Earned across all three club revenue centers
  const grossRevenue = Math.round((courtsRevenue + shopRevenue + cafeRevenue) * 100) / 100;

  // 6. "What do we owe?" (Obligations, Payroll & Liabilities)
  // Staff Monthly Payroll Liability
  const staffPayrollAgg = await prisma.staff.aggregate({
    _sum: { salary: true },
    _count: { id: true },
  });
  const totalMonthlyPayroll = Number(staffPayrollAgg._sum.salary || 0);
  const activeStaffCount = staffPayrollAgg._count.id || 0;

  // Pro-rate payroll for the period (Month = 1x, Week = 7/30, Day = 1/30)
  const proratedPayrollExpense =
    period === "this_month"
      ? totalMonthlyPayroll
      : Math.round((totalMonthlyPayroll * (periodDays / 30)) * 100) / 100;

  // Circulating Member Card Balances (Prepaid funds held by club)
  const circulatingMemberBalancesAgg = await prisma.user.aggregate({
    _sum: { amount: true },
    _count: { id: true },
  });
  const circulatingMemberBalances = Number(circulatingMemberBalancesAgg._sum.amount || 0);

  // Net Operating Result = Gross Revenue minus Period Staff Payroll Expense
  const netOperatingIncome = Math.round((grossRevenue - proratedPayrollExpense) * 100) / 100;

  return {
    period: {
      key: period,
      label,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      periodDays,
    },
    executiveSummary: {
      grossRevenue,
      netOperatingIncome,
      totalTransactions: courtsBookingsCount + shopPurchasesCount + cafeOrdersCount,
      walletTopupsInflow,
      proratedPayrollExpense,
      circulatingMemberBalances,
    },
    revenueStreams: {
      courts: {
        totalRevenue: courtsRevenue,
        bookingsCount: courtsBookingsCount,
        percentageOfGross: grossRevenue > 0 ? `${Math.round((courtsRevenue / grossRevenue) * 100)}%` : "0%",
        bySport: courtsBySport.map((s) => ({
          sport: s.whichCourt,
          revenue: Number(s._sum.totalAmount || 0),
          bookings: s._count.id,
        })),
      },
      gearShop: {
        totalRevenue: shopRevenue,
        retailSalesRevenue: shopSalesRevenue,
        stringingServicesRevenue: stringingRevenue,
        purchasesCount: shopPurchasesCount,
        stringingJobsCount,
        discountsGiven: shopDiscountsGiven,
        percentageOfGross: grossRevenue > 0 ? `${Math.round((shopRevenue / grossRevenue) * 100)}%` : "0%",
      },
      barAndCafeteria: {
        totalRevenue: cafeRevenue,
        ordersCount: cafeOrdersCount,
        percentageOfGross: grossRevenue > 0 ? `${Math.round((cafeRevenue / grossRevenue) * 100)}%` : "0%",
      },
    },
    paymentMethodsBreakdown: {
      virtualCard: paymentBreakdown.VIRTUAL_CARD,
      cash: paymentBreakdown.CASH,
      card: paymentBreakdown.CARD,
      upi: paymentBreakdown.UPI,
      online: paymentBreakdown.ONLINE,
    },
    liabilitiesAndObligations: {
      activeStaffCount,
      totalMonthlyStaffPayroll: totalMonthlyPayroll,
      proratedStaffPayrollForPeriod: proratedPayrollExpense,
      circulatingMemberBalancesOwed: circulatingMemberBalances,
      description: "Payroll liabilities to employees and customer prepaid wallet balances held in escrow.",
    },
  };
};
