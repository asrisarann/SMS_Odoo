import { getExecutiveFinancialReport } from "./financials.service.js";

/**
 * GET /api/financials
 * GET /api/super-admin/financials
 * Consolidated Financial & Executive Monthly Reporting.
 * Query params: period=today|this_week|this_month|custom, startDate, endDate.
 */
export const getFinancialReportHandler = async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;
    const report = await getExecutiveFinancialReport({ period, startDate, endDate });
    return res.status(200).json(report);
  } catch (error) {
    console.error("Executive financial report error:", error);
    return res.status(500).json({ message: "Failed to generate financial report", error: error.message });
  }
};
