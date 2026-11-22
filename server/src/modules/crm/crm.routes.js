import { Router } from "express";
import {
  createEnquiryHandler,
  getEnquiriesHandler,
  getCRMOverviewHandler,
  getEnquiryByIdHandler,
  updateStatusHandler,
  sendQuoteHandler,
  bookTrialHandler,
  convertLeadHandler,
} from "./crm.controller.js";
import { authenticate, requireRoles } from "../../common/middlewares/auth.middleware.js";

const router = Router();

// 1. PUBLIC: Website visitor enquiry submission
router.post("/", createEnquiryHandler);

// All subsequent CRM management endpoints require Staff or Admin authentication
router.use(authenticate);
router.use(requireRoles("SUPERADMIN", "ADMIN", "SUBADMIN", "STAFF"));

// 2. Pipeline overview and analytics
router.get("/overview", getCRMOverviewHandler);
router.get("/pipeline", getCRMOverviewHandler);

// 3. Directory of enquiries
router.get("/", getEnquiriesHandler);

// 4. Single enquiry details
router.get("/:id", getEnquiryByIdHandler);

// 5. Update enquiry status & follow-up notes
router.patch("/:id/status", updateStatusHandler);

// 6. Generate & send quotation email
router.post("/:id/quote", sendQuoteHandler);

// 7. Book complimentary trial session
router.post("/:id/trial", bookTrialHandler);

// 8. Convert lead into registered club member
router.post("/:id/convert", convertLeadHandler);

export default router;
