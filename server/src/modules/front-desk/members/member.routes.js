import { Router } from "express";
import {
  searchMembersHandler,
  getMemberByPhoneHandler,
  getMember360Handler,
  checkInMemberHandler,
} from "./member.controller.js";
import { authenticate, requireRoles } from "../../../common/middlewares/auth.middleware.js";

const router = Router();

// All member 360 routes require authentication
router.use(authenticate);

// 1. Search members (Staff, Admin, SuperAdmin)
router.get(
  "/search",
  requireRoles("SUPERADMIN", "ADMIN", "SUBADMIN", "STAFF"),
  searchMembersHandler
);

// 2. Lookup member by phone (Staff, Admin, SuperAdmin)
router.get(
  "/phone/:phone",
  requireRoles("SUPERADMIN", "ADMIN", "SUBADMIN", "STAFF"),
  getMemberByPhoneHandler
);

// 3. One-click check-in (Staff, Admin, SuperAdmin)
router.post(
  "/:id/checkin",
  requireRoles("SUPERADMIN", "ADMIN", "SUBADMIN", "STAFF"),
  checkInMemberHandler
);

// 4. Member 360 Profile & History (Staff, Admin, or the member themselves)
router.get("/:id/history", getMember360Handler);
router.get("/:id", getMember360Handler);

export default router;
