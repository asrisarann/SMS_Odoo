import prisma from "../../config/prisma.js";
import { sendEmail } from "../../common/utils/mailer.js";

/**
 * 1. Create a new prospective member inquiry (Publicly accessible).
 * As per PRD:
 * "When a visitor reaches out, that enquiry should not vanish. Someone at the club should hear about it, follow up, send a quote and, hopefully, welcome a new member."
 */
export const createEnquiry = async (data) => {
  const {
    name,
    email,
    phone,
    sportOfInterest,
    membershipOfInterest,
    message,
    isTrialRequested = false,
    preferredTrialDate,
    preferredTrialTime,
  } = data;

  if (!name || !email || !phone) {
    const error = new Error("Name, email, and phone are required fields.");
    error.statusCode = 400;
    throw error;
  }

  // Normalize sport and membership if provided
  const normalizedSport = sportOfInterest ? sportOfInterest.toUpperCase() : null;
  const normalizedMembership = membershipOfInterest ? membershipOfInterest.toUpperCase() : null;

  const enquiry = await prisma.enquiry.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      sportOfInterest: normalizedSport,
      membershipOfInterest: normalizedMembership,
      message: message ? message.trim() : null,
      isTrialRequested: Boolean(isTrialRequested),
      preferredTrialDate: preferredTrialDate ? new Date(preferredTrialDate) : null,
      preferredTrialTime: preferredTrialTime || null,
      status: "NEW",
    },
  });

  // Send friendly automatic acknowledgment email to prospective member
  const trialText = isTrialRequested
    ? `\nWe noted your request for a complimentary trial session${preferredTrialDate ? ` on ${preferredTrialDate}` : ""}. Our front desk team will contact you shortly to confirm your trial slot!`
    : "";

  await sendEmail({
    to: enquiry.email,
    subject: "Thank you for contacting The Champions Club!",
    text: `Hello ${enquiry.name},\n\nThank you for reaching out to The Champions Club! We received your enquiry.${trialText}\n\nOne of our team members will be in touch with you shortly with plan options and court availability.\n\nWarm regards,\nThe Champions Club Team`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #15803d; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 22px;">Welcome to The Champions Club</h2>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 16px;">Dear <strong>${enquiry.name}</strong>,</p>
          <p>Thank you for expressing interest in <strong>The Champions Club</strong>. We are thrilled to connect with you!</p>
          ${isTrialRequested ? `<div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px; margin: 16px 0;"><strong>Complimentary Trial Session:</strong> We noted your trial request${preferredTrialDate ? ` on <strong>${preferredTrialDate}</strong>` : ""}. A staff member will confirm your court time shortly!</div>` : ""}
          <p>Our team is reviewing your details and will follow up promptly with our membership options, court schedules, and equipment offerings.</p>
          <p>Best regards,<br><strong>The Champions Club Team</strong></p>
        </div>
      </div>
    `,
  });

  return enquiry;
};

/**
 * 2. Get list of enquiries with filtering, search, and pagination (Staff / Admin).
 */
export const getEnquiries = async ({
  status,
  sport,
  search,
  page = 1,
  limit = 10,
}) => {
  const where = {};
  const andConditions = [];

  if (status) {
    andConditions.push({ status: status.toUpperCase() });
  }

  if (sport) {
    andConditions.push({ sportOfInterest: sport.toUpperCase() });
  }

  if (search && search.trim()) {
    const term = search.trim();
    andConditions.push({
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { phone: { contains: term, mode: "insensitive" } },
        { message: { contains: term, mode: "insensitive" } },
      ],
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (p - 1) * l;

  const [enquiries, totalCount] = await Promise.all([
    prisma.enquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: l,
    }),
    prisma.enquiry.count({ where }),
  ]);

  return {
    totalCount,
    totalPages: Math.ceil(totalCount / l) || 1,
    currentPage: p,
    limit: l,
    enquiries,
  };
};

/**
 * 3. Get single enquiry details.
 */
export const getEnquiryById = async (id) => {
  const enquiry = await prisma.enquiry.findUnique({
    where: { id },
  });

  if (!enquiry) {
    const error = new Error(`Enquiry with ID '${id}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  return enquiry;
};

/**
 * 4. Update enquiry status and follow-up notes (Staff / Admin).
 * Lifecycle: NEW -> CONTACTED -> QUOTE_SENT -> CONVERTED -> CLOSED_LOST
 */
export const updateEnquiryStatus = async (id, { status, notes }) => {
  const existing = await getEnquiryById(id);

  const allowedStatuses = ["NEW", "CONTACTED", "QUOTE_SENT", "CONVERTED", "CLOSED_LOST"];
  const nextStatus = (status || existing.status).toUpperCase();

  if (!allowedStatuses.includes(nextStatus)) {
    const error = new Error(`Invalid status '${status}'. Allowed: ${allowedStatuses.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  let updatedNotes = existing.notes;
  if (notes && notes.trim()) {
    const timestamp = new Date().toISOString().split("T")[0];
    const newNoteEntry = `[${timestamp}] ${notes.trim()}`;
    updatedNotes = existing.notes ? `${existing.notes}\n${newNoteEntry}` : newNoteEntry;
  }

  return prisma.enquiry.update({
    where: { id },
    data: {
      status: nextStatus,
      notes: updatedNotes,
    },
  });
};

/**
 * 5. Send a personalized quotation to the prospective member.
 * Transitions enquiry status to QUOTE_SENT and logs quotation details.
 */
export const sendQuote = async (id, quoteData) => {
  const enquiry = await getEnquiryById(id);
  const { quoteAmount, quoteDetails, validityDays = 14, staffNotes } = quoteData;

  if (quoteAmount === undefined || quoteAmount === null || Number(quoteAmount) < 0) {
    const error = new Error("A valid non-negative quoteAmount is required.");
    error.statusCode = 400;
    throw error;
  }

  const amount = Number(quoteAmount);
  const details = quoteDetails?.trim() || `Special Membership & Court Access Package for ${enquiry.sportOfInterest || "Sports"}`;
  const validUntil = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);
  const formattedExpiry = validUntil.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Send Quote Email via nodemailer
  await sendEmail({
    to: enquiry.email,
    subject: `Official Membership Quotation - The Champions Club (Ref: ${enquiry.id.slice(0, 8)})`,
    text: `Hello ${enquiry.name},\n\nWe are pleased to provide your quotation for The Champions Club.\n\nPackage: ${details}\nQuoted Amount: ₹${amount}\nOffer Valid Until: ${formattedExpiry}\n\nTo accept this quotation or book your introductory session, simply reply to this email or visit our front desk.\n\nThank you,\nThe Champions Club`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0284c7; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 22px;">Membership Quotation</h2>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 16px;">Dear <strong>${enquiry.name}</strong>,</p>
          <p>Thank you for considering <strong>The Champions Club</strong>. Following your enquiry, here is your customized membership and court access proposal:</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 6px 0;"><strong>Package Description:</strong> ${details}</p>
            ${enquiry.membershipOfInterest ? `<p style="margin: 6px 0;"><strong>Membership Tier:</strong> ${enquiry.membershipOfInterest}</p>` : ""}
            ${enquiry.sportOfInterest ? `<p style="margin: 6px 0;"><strong>Primary Sport:</strong> ${enquiry.sportOfInterest}</p>` : ""}
            <p style="margin: 6px 0; font-size: 18px; color: #0f766e;"><strong>Quoted Amount:</strong> ₹${amount.toFixed(2)}</p>
            <p style="margin: 6px 0; font-size: 13px; color: #64748b;"><strong>Valid Until:</strong> ${formattedExpiry}</p>
          </div>

          <p>We would love to welcome you to the club. Reply to this email or visit our front desk to activate your membership!</p>
          <p>Warm regards,<br><strong>The Champions Club Sales Team</strong></p>
        </div>
      </div>
    `,
  });

  let notes = enquiry.notes;
  if (staffNotes?.trim()) {
    const timestamp = new Date().toISOString().split("T")[0];
    const newNote = `[${timestamp}] Quote sent for ₹${amount}. ${staffNotes.trim()}`;
    notes = notes ? `${notes}\n${newNote}` : newNote;
  }

  // Update enquiry in database
  return prisma.enquiry.update({
    where: { id },
    data: {
      status: "QUOTE_SENT",
      quoteAmount: amount,
      quoteDetails: details,
      quoteSentAt: new Date(),
      notes,
    },
  });
};

/**
 * 6. Book a Complimentary Trial Session for the lead.
 */
export const bookTrialSession = async (id, trialData) => {
  const enquiry = await getEnquiryById(id);
  const { sport, date, startTime, notes } = trialData;

  const targetSport = (sport || enquiry.sportOfInterest || "TENNIS").toUpperCase();
  const trialDate = date || enquiry.preferredTrialDate?.toISOString().split("T")[0];
  const trialTime = startTime || enquiry.preferredTrialTime || "17:00";

  if (!trialDate) {
    const error = new Error("Trial session date (YYYY-MM-DD) is required.");
    error.statusCode = 400;
    throw error;
  }

  // Send Trial Confirmation Email
  await sendEmail({
    to: enquiry.email,
    subject: `Trial Session Confirmed: ${targetSport} at The Champions Club`,
    text: `Hello ${enquiry.name},\n\nYour complimentary trial session for ${targetSport} has been confirmed for ${trialDate} at ${trialTime}!\n\nPlease arrive 10 minutes before your slot. Rackets and balls can be rented or purchased at our Gear Shop.\n\nSee you on the court,\nThe Champions Club`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #16a34a; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 22px;">Trial Session Confirmed!</h2>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 16px;">Dear <strong>${enquiry.name}</strong>,</p>
          <p>Your trial session has been reserved. We look forward to meeting you!</p>
          
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Sport:</strong> ${targetSport}</p>
            <p style="margin: 4px 0;"><strong>Date:</strong> ${trialDate}</p>
            <p style="margin: 4px 0;"><strong>Time:</strong> ${trialTime}</p>
            <p style="margin: 4px 0;"><strong>Location:</strong> The Champions Club Courts</p>
          </div>

          <p>Please check in at the front desk upon arrival. Enjoy your session!</p>
          <p>Best regards,<br><strong>The Champions Club Team</strong></p>
        </div>
      </div>
    `,
  });

  const timestamp = new Date().toISOString().split("T")[0];
  const trialNote = `[${timestamp}] Complimentary trial session confirmed for ${targetSport} on ${trialDate} at ${trialTime}.${notes ? ` Note: ${notes}` : ""}`;
  const updatedNotes = enquiry.notes ? `${enquiry.notes}\n${trialNote}` : trialNote;

  return prisma.enquiry.update({
    where: { id },
    data: {
      isTrialRequested: true,
      preferredTrialDate: new Date(trialDate),
      preferredTrialTime: trialTime,
      notes: updatedNotes,
      status: enquiry.status === "NEW" ? "CONTACTED" : enquiry.status,
    },
  });
};

/**
 * 7. Convert Lead directly into a registered club member in the User table.
 */
export const convertLeadToMember = async (id, memberData = {}) => {
  const enquiry = await getEnquiryById(id);

  if (enquiry.status === "CONVERTED" && enquiry.convertedUserId) {
    const error = new Error("This enquiry has already been converted to a member.");
    error.statusCode = 400;
    throw error;
  }

  const membershipTier = (
    memberData.membership ||
    enquiry.membershipOfInterest ||
    "SILVER"
  ).toUpperCase();

  const initialAmount = Number(memberData.initialWalletAmount) || 0;
  const renewalMonths = membershipTier === "GOLD" ? 12 : membershipTier === "SILVER" ? 6 : 3;
  const renewalDate = new Date(Date.now() + renewalMonths * 30 * 24 * 60 * 60 * 1000);

  // Check if user with email or phone already exists
  let user = await prisma.user.findFirst({
    where: {
      OR: [{ email: enquiry.email }, { phone: enquiry.phone }],
    },
  });

  if (user) {
    // Upgrade existing user to member tier
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        membership: membershipTier,
        renewalDate,
        amount: {
          increment: initialAmount,
        },
      },
    });
  } else {
    // Create new User
    user = await prisma.user.create({
      data: {
        name: enquiry.name,
        email: enquiry.email,
        phone: enquiry.phone,
        role: "MEMBER",
        membership: membershipTier,
        renewalDate,
        amount: initialAmount,
        lastEntry: new Date(),
      },
    });
  }

  // Update Enquiry to CONVERTED
  const updatedEnquiry = await prisma.enquiry.update({
    where: { id },
    data: {
      status: "CONVERTED",
      convertedUserId: user.id,
      notes: `${enquiry.notes || ""}\n[${new Date().toISOString().split("T")[0]}] Successfully converted to ${membershipTier} member (User ID: ${user.id}).`,
    },
  });

  // Send Welcome Email to newly converted member
  await sendEmail({
    to: user.email,
    subject: `Welcome to The Champions Club - ${membershipTier} Membership Activated!`,
    text: `Hello ${user.name},\n\nCongratulations! Your ${membershipTier} membership at The Champions Club has been officially activated!\n\nYou can now enjoy member discounts across all courts, gear shop, and cafeteria.\n\nWelcome to our community,\nThe Champions Club`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #854d0e; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 22px;">Welcome to The Champions Club!</h2>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 16px;">Dear <strong>${user.name}</strong>,</p>
          <p>Congratulations! Your official <strong>${membershipTier} Membership</strong> is now active!</p>
          <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Membership Tier:</strong> ${membershipTier}</p>
            <p style="margin: 4px 0;"><strong>Wallet Balance:</strong> ₹${Number(user.amount).toFixed(2)}</p>
            <p style="margin: 4px 0;"><strong>Renewal Date:</strong> ${renewalDate.toLocaleDateString("en-IN")}</p>
          </div>
          <p>We are delighted to have you as part of our club family.</p>
          <p>Warmest regards,<br><strong>The Champions Club Team</strong></p>
        </div>
      </div>
    `,
  });

  return {
    message: "Enquiry successfully converted to active club member!",
    enquiry: updatedEnquiry,
    member: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      membership: user.membership,
      renewalDate: user.renewalDate,
      walletBalance: Number(user.amount),
    },
  };
};

/**
 * 8. CRM Pipeline Overview & Funnel Analytics.
 */
export const getCRMOverview = async () => {
  const [totalCount, byStatusRows, recentEnquiries] = await Promise.all([
    prisma.enquiry.count(),
    prisma.enquiry.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.enquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const statusMap = {
    NEW: 0,
    CONTACTED: 0,
    QUOTE_SENT: 0,
    CONVERTED: 0,
    CLOSED_LOST: 0,
  };

  for (const row of byStatusRows) {
    statusMap[row.status] = row._count.status;
  }

  const convertedCount = statusMap.CONVERTED || 0;
  const conversionRate = totalCount > 0 ? Math.round((convertedCount / totalCount) * 100 * 10) / 10 : 0;

  return {
    totalEnquiries: totalCount,
    conversionRate: `${conversionRate}%`,
    pipeline: statusMap,
    recentEnquiries,
  };
};
