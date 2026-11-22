import {
  createEnquiry,
  getEnquiries,
  getEnquiryById,
  updateEnquiryStatus,
  sendQuote,
  bookTrialSession,
  convertLeadToMember,
  getCRMOverview,
} from "./crm.service.js";

/**
 * POST /api/enquiries
 * Public lead capture endpoint for website visitors.
 */
export const createEnquiryHandler = async (req, res) => {
  try {
    const enquiry = await createEnquiry(req.body);
    return res.status(201).json({
      message: "Thank you for reaching out! Your enquiry has been received.",
      enquiry,
    });
  } catch (error) {
    console.error("Create enquiry error:", error);
    return res.status(error.statusCode || 400).json({ message: error.message });
  }
};

/**
 * GET /api/enquiries
 * Staff / Admin directory of enquiries with filters.
 */
export const getEnquiriesHandler = async (req, res) => {
  try {
    const { status, sport, search, page, limit } = req.query;
    const result = await getEnquiries({ status, sport, search, page, limit });
    return res.status(200).json(result);
  } catch (error) {
    console.error("Get enquiries error:", error);
    return res.status(500).json({ message: "Failed to fetch enquiries", error: error.message });
  }
};

/**
 * GET /api/enquiries/overview
 * GET /api/enquiries/pipeline
 * CRM Pipeline Overview & conversion stats.
 */
export const getCRMOverviewHandler = async (req, res) => {
  try {
    const overview = await getCRMOverview();
    return res.status(200).json(overview);
  } catch (error) {
    console.error("Get CRM overview error:", error);
    return res.status(500).json({ message: "Failed to fetch CRM overview", error: error.message });
  }
};

/**
 * GET /api/enquiries/:id
 * Single enquiry details.
 */
export const getEnquiryByIdHandler = async (req, res) => {
  try {
    const enquiry = await getEnquiryById(req.params.id);
    return res.status(200).json(enquiry);
  } catch (error) {
    console.error("Get enquiry by ID error:", error);
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};

/**
 * PATCH /api/enquiries/:id/status
 * Update status and follow-up notes.
 */
export const updateStatusHandler = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const updated = await updateEnquiryStatus(req.params.id, { status, notes });
    return res.status(200).json({
      message: "Enquiry status updated successfully",
      enquiry: updated,
    });
  } catch (error) {
    console.error("Update enquiry status error:", error);
    return res.status(error.statusCode || 400).json({ message: error.message });
  }
};

/**
 * POST /api/enquiries/:id/quote
 * Send quotation to prospective member.
 */
export const sendQuoteHandler = async (req, res) => {
  try {
    const updated = await sendQuote(req.params.id, req.body);
    return res.status(200).json({
      message: "Quotation generated and dispatched to prospective member successfully.",
      enquiry: updated,
    });
  } catch (error) {
    console.error("Send quote error:", error);
    return res.status(error.statusCode || 400).json({ message: error.message });
  }
};

/**
 * POST /api/enquiries/:id/trial
 * Confirm complimentary trial session.
 */
export const bookTrialHandler = async (req, res) => {
  try {
    const updated = await bookTrialSession(req.params.id, req.body);
    return res.status(200).json({
      message: "Trial session confirmed and invitation sent to prospective member.",
      enquiry: updated,
    });
  } catch (error) {
    console.error("Book trial error:", error);
    return res.status(error.statusCode || 400).json({ message: error.message });
  }
};

/**
 * POST /api/enquiries/:id/convert
 * Convert lead to member.
 */
export const convertLeadHandler = async (req, res) => {
  try {
    const result = await convertLeadToMember(req.params.id, req.body);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Convert lead error:", error);
    return res.status(error.statusCode || 400).json({ message: error.message });
  }
};
