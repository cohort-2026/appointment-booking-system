import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";
import { hashStaffInvitationToken } from "../lib/staff-invitation.js";
import { normalizePhone as normalizeAccountPhone } from "../lib/phone.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  issueOtp,
  issuePasswordResetOtp,
  otpMatches,
  getCooldownRemainingMs,
  OTP_MAX_ATTEMPTS,
} from "../services/otp.service.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RULES: { label: string; test: RegExp }[] = [
  { label: "at least 8 characters", test: /.{8,}/ },
  { label: "one uppercase letter", test: /[A-Z]/ },
  { label: "one lowercase letter", test: /[a-z]/ },
  { label: "one number", test: /\d/ },
  { label: "one special character", test: /[^A-Za-z0-9]/ },
];

function getPasswordComplexityError(password: unknown): string | null {
  if (typeof password !== "string") {
    return "Password is required";
  }

  const failed = PASSWORD_RULES.filter((rule) => !rule.test.test(password));

  if (failed.length === 0) {
    return null;
  }

  return `Password must contain ${failed.map((rule) => rule.label).join(", ")}`;
}

async function isPhoneTaken(phone: string): Promise<boolean> {
  const [existingUserPhone, existingBusinessPhone] = await Promise.all([
    prisma.user.findFirst({ where: { phone } }),
    prisma.business.findFirst({ where: { phone } }),
  ]);

  return Boolean(existingUserPhone || existingBusinessPhone);
}

function normalizePhone(rawPhone: string): string | null {
  // Strip everything except digits and a leading +
  const trimmed = rawPhone.trim();
  const digitsAndPlus = trimmed.replace(/(?!^\+)[^\d]/g, "");

  let normalized: string;

  if (digitsAndPlus.startsWith("+27")) {
    normalized = digitsAndPlus;
  } else if (digitsAndPlus.startsWith("0")) {
    normalized = `+27${digitsAndPlus.slice(1)}`;
  } else if (digitsAndPlus.startsWith("27")) {
    normalized = `+${digitsAndPlus}`;
  } else {
    return null;
  }

  // A valid SA number is +27 followed by exactly 9 digits
  const isValid = /^\+27\d{9}$/.test(normalized);

  return isValid ? normalized : null;
}


const USER_ROLE_INCLUDE = {
  soleProvider: true,
  business: true,
  businessStaff: {
    include: {
      business: true,
    },
  },
} as const;

type UserWithRoleData = Awaited<
  ReturnType<
    typeof prisma.user.findUnique<{
      where: { id: string };
      include: typeof USER_ROLE_INCLUDE;
    }>
  >
>;

function serializeUser(user: NonNullable<UserWithRoleData>) {
  const {
    passwordHash: _passwordHash,
    otpCode: _otpCode,
    otpExpiresAt: _otpExpiresAt,
    otpAttempts: _otpAttempts,
    passwordResetCode: _passwordResetCode,
    passwordResetExpiresAt: _passwordResetExpiresAt,
    passwordResetAttempts: _passwordResetAttempts,
    ...safeUser
  } = user;

  return {
    ...safeUser,
    soleProvider: user.role === "SOLE_PROVIDER" ? user.soleProvider : null,
    business: user.role === "BUSINESS_OWNER" ? user.business : null,
    businessStaff:
      user.role === "BUSINESS_STAFF" ? user.businessStaff : null,
  };
}

const SELF_REGISTERED_ROLES = ["CUSTOMER", "SOLE_PROVIDER", "BUSINESS_OWNER"];

async function sendOtpSafely(user: {
  id: string;
  email: string;
  firstName: string;
}): Promise<boolean> {
  try {
    await issueOtp(user);
    return true;
  } catch (error) {
    console.error("Failed to send verification email:", error);
    return false;
  }
}

function setSessionCookie(res: Response, user: { id: string; role: string }) {
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: "1d" },
  );

  res.cookie("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000,
  });
}

export const registerCustomer = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      confirmPassword,
      agree,
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Full name, email and password are required",
      });
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    // Check terms
    if (!agree) {
      return res.status(400).json({
        success: false,
        message: "You must accept the terms and privacy policy",
      });
    }

    // Check passwords
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    // Check password complexity
    const passwordError = getPasswordComplexityError(password);

    if (passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError,
      });
    }

    // Check whether email already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase().trim(),
      },
    });

    if (existingUser) {
      if (!existingUser.isVerified) {
        let emailSent = getCooldownRemainingMs(existingUser.otpExpiresAt) > 0;

        if (!emailSent) {
          emailSent = await sendOtpSafely(existingUser);
        }

        return res.status(200).json({
          success: true,
          requiresVerification: true,
          emailSent,
          email: existingUser.email,
          message: "This email is already registered but not verified. We've sent a code.",
        });
      }

      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const normalizedUserPhone = phone?.trim() ? normalizePhone(phone) : null;

    if (phone?.trim() && !normalizedUserPhone) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid phone number",
      });
    }

    if (normalizedUserPhone && (await isPhoneTaken(normalizedUserPhone))) {
      return res.status(409).json({
        success: false,
        message: "This phone number is already in use",
      });
    }

    // Split full name
    const nameParts = fullName.trim().split(/\s+/);

    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.slice(1).join(" ") || null;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create customer
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        firstName,
        lastName,
        phone: normalizedUserPhone,
        role: "CUSTOMER",
        termsAcceptedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    const emailSent = await sendOtpSafely(user);

    return res.status(201).json({
      success: true,
      requiresVerification: true,
      emailSent,
      message: "Customer account created successfully",
      user,
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        success: false,
        message: "An account with this email or phone number already exists",
      });
    }

    console.error("Customer registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating the account",
    });
  }
};

export const login = async (
  req: Request,
  res: Response,
) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (!EMAIL_REGEX.test(String(email).trim())) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    // Find user, including whichever role-specific relation applies
    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase().trim(),
      },
      include: USER_ROLE_INCLUDE,
    });

    // Don't reveal whether the email exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Wrong login credentials",
      });
    }

    // Check password
    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Wrong login credentials",
      });
    }

    if (!user.isVerified && SELF_REGISTERED_ROLES.includes(user.role)) {
      let emailSent = getCooldownRemainingMs(user.otpExpiresAt) > 0;

      if (!emailSent) {
        emailSent = await sendOtpSafely(user);
      }

      return res.status(403).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        email: user.email,
        emailSent,
        message: "Please verify your email to continue",
      });
    }

    // Make sure JWT secret exists
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        success: false,
        message: "Server authentication configuration error",
      });
    }

    // Create JWT
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    res.cookie("session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: serializeUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while logging in",
    });
  }
};

export const logout = async (_req: Request, res: Response) => {
  res.clearCookie("session", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

export const getMe = async (
  req: Request,
  res: Response,
) => {
  try {
    const authReq = req as Request & {
      user?: {
        userId: string;
        role: string;
      };
    };

    if (!authReq.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: authReq.user.userId,
      },
      include: USER_ROLE_INCLUDE,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: serializeUser(user),
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const updateMe = async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const allowedFields = new Set(["firstName", "lastName", "phone"]);
  const invalidField = Object.keys(body ?? {}).find((field) => !allowedFields.has(field));
  if (!body || typeof body !== "object" || Array.isArray(body) || invalidField) {
    return res.status(400).json({
      success: false,
      message: invalidField ? `Unsupported profile field: ${invalidField}` : "A profile object is required",
    });
  }

  const data: { firstName?: string; lastName?: string | null; phone?: string | null } = {};
  if (Object.hasOwn(body, "firstName")) {
    if (typeof body.firstName !== "string" || !/^[\p{L}][\p{L}\p{M} .'-]{0,49}$/u.test(body.firstName.trim())) {
      return res.status(400).json({ success: false, message: "Enter a valid first name" });
    }
    data.firstName = body.firstName.trim();
  }
  if (Object.hasOwn(body, "lastName")) {
    if (body.lastName !== null && (typeof body.lastName !== "string" || body.lastName.trim().length > 80)) {
      return res.status(400).json({ success: false, message: "Last name must be 80 characters or fewer" });
    }
    data.lastName = typeof body.lastName === "string" ? body.lastName.trim() || null : null;
  }
  if (Object.hasOwn(body, "phone")) {
    if (body.phone !== null && typeof body.phone !== "string") {
      return res.status(400).json({ success: false, message: "Phone must be a string or null" });
    }
    const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";
    const phone = rawPhone ? normalizeAccountPhone(rawPhone) : null;
    if (rawPhone && !phone) {
      return res.status(400).json({ success: false, message: "Enter a valid South African phone number" });
    }
    data.phone = phone;
  }
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ success: false, message: "At least one profile field is required" });
  }

  try {
    await prisma.user.update({ where: { id: req.user!.userId }, data });
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: USER_ROLE_INCLUDE,
    });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.status(200).json({ success: true, user: serializeUser(user) });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return res.status(409).json({ success: false, message: "That phone number is already in use" });
    }
    console.error("Update current user error:", error);
    return res.status(500).json({ success: false, message: "Unable to update your profile" });
  }
};


export const registerProvider = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      fullName,
      serviceName,
      email,
      phone,
      city,
      category,
      experience,
      bio,
      password,
      confirmPassword,
      agree,
    } = req.body;

    // Validate required fields
    if (
      !fullName ||
      !serviceName ||
      !email ||
      !phone ||
      !city ||
      !category ||
      !experience ||
      !password ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Full name, service name, email and password are required",
      });
    }

    if (
      typeof fullName !== "string" ||
      !/^[\p{L}][\p{L}\p{M} .'-]{1,99}$/u.test(fullName.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid full name",
      });
    }

    if (
      typeof serviceName !== "string" ||
      !serviceName.trim() ||
      serviceName.trim().length > 100 ||
      EMAIL_REGEX.test(serviceName.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid service name",
      });
    }

    if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    if (typeof phone !== "string" || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid phone number",
      });
    }

    if (
      typeof city !== "string" ||
      !/^[\p{L}\p{M}][\p{L}\p{M} .,'-]{1,99}$/u.test(city.trim()) ||
      EMAIL_REGEX.test(city.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid city or service area",
      });
    }

    if (
      typeof category !== "string" ||
      !["Hair & Beauty", "Health & Wellness", "Fitness & Coaching", "Home Services", "Tutoring & Lessons", "Other"].includes(category)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid service category",
      });
    }

    if (
      typeof experience !== "string" ||
      !["Just starting out", "1–3 years", "4–9 years", "10+ years"].includes(experience)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid experience level",
      });
    }

    if (bio !== undefined && (typeof bio !== "string" || bio.trim().length > 500)) {
      return res.status(400).json({
        success: false,
        message: "Your bio must be 500 characters or fewer",
      });
    }

    // Check terms
    if (!agree) {
      return res.status(400).json({
        success: false,
        message:
          "You must accept the provider agreement, terms and privacy policy",
      });
    }

    // Check passwords
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    // Check password complexity
    const passwordError = getPasswordComplexityError(password);

    if (passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError,
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check whether email already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      // Unverified account: send them to the OTP step instead of a dead end
      if (!existingUser.isVerified) {
        let emailSent = getCooldownRemainingMs(existingUser.otpExpiresAt) > 0;

        if (!emailSent) {
          emailSent = await sendOtpSafely(existingUser);
        }

        return res.status(200).json({
          success: true,
          requiresVerification: true,
          emailSent,
          email: existingUser.email,
          message: "This email is already registered but not verified. We've sent a code.",
        });
      }

      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const normalizedUserPhone = phone?.trim() ? normalizePhone(phone) : null;

    if (phone?.trim() && !normalizedUserPhone) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid phone number",
      });
    }

    if (normalizedUserPhone && (await isPhoneTaken(normalizedUserPhone))) {
      return res.status(409).json({
        success: false,
        message: "This phone number is already in use",
      });
    }

    // Signup always uses Basic; client-supplied plan/payment fields are ignored.
    const selectedPackage = await prisma.package.findUnique({
      where: {
        providerType_tier: {
          providerType: "SOLE_PROVIDER",
          tier: "BASIC",
        },
      },
    });

    if (!selectedPackage || Number(selectedPackage.monthlyPrice) !== 0) {
      return res.status(500).json({
        success: false,
        message: "Selected provider package is not available",
      });
    }

    // Split full name
    const nameParts = fullName.trim().split(/\s+/);

    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.slice(1).join(" ") || null;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create User, SoleProvider and Subscription together
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          firstName,
          lastName,
          phone: normalizedUserPhone,
          role: "SOLE_PROVIDER",
          termsAcceptedAt: new Date(),
        },
      });

      const soleProvider = await tx.soleProvider.create({
        data: {
          userId: user.id,
          displayName: fullName.trim(),
          serviceName: serviceName.trim(),
          category: category?.trim() || null,
          experience: experience?.trim() || null,
          bio: bio?.trim() || null,
          city: city?.trim() || null,
        },
      });

      const billingStartDate = new Date();

      const nextBillingDate = new Date(billingStartDate);
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

      const subscription = await tx.providerSubscription.create({
        data: {
          soleProviderId: soleProvider.id,
          packageId: selectedPackage.id,
          status: "ACTIVE",
          dailyAppointmentLimit:
            selectedPackage.dailyAppointmentLimit,
          maxStaff: selectedPackage.maxStaff,
          billingStartDate,
          nextBillingDate,
          paymentStatus: "PAID", // Free plan; no payment was collected.
        },
        include: {
          package: true,
        },
      });

      return {
        user,
        soleProvider,
        subscription,
      };
    });

    const emailSent = await sendOtpSafely(result.user);

    return res.status(201).json({
      success: true,
      requiresVerification: true,
      emailSent,
      message: "Provider account created successfully",
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        phone: result.user.phone,
        role: result.user.role,
        createdAt: result.user.createdAt,
      },
      provider: {
        id: result.soleProvider.id,
        displayName: result.soleProvider.displayName,
        serviceName: result.soleProvider.serviceName,
        category: result.soleProvider.category,
        experience: result.soleProvider.experience,
        bio: result.soleProvider.bio,
        city: result.soleProvider.city,
      },
      subscription: {
        id: result.subscription.id,
        status: result.subscription.status,
        paymentStatus: result.subscription.paymentStatus,
        dailyAppointmentLimit:
          result.subscription.dailyAppointmentLimit,
        package: {
          tier: result.subscription.package.tier,
          monthlyPrice: result.subscription.package.monthlyPrice,
        },
      },
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        success: false,
        message: "An account with this email or phone number already exists",
      });
    }

    console.error("Provider registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating the provider account",
    });
  }
};

export const registerBusiness = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      businessName,
      category,
      staffSize,
      contactName,
      email,
      phone,
      address,
      password,
      confirmPassword,
      agree,
    } = req.body;

    // Required fields
    if (
      !businessName ||
      !category ||
      !staffSize ||
      !contactName ||
      !email ||
      !phone ||
      !address ||
      !password ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "Please complete all required fields",
      });
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    // Terms
    if (!agree) {
      return res.status(400).json({
        success: false,
        message: "You must accept the terms and privacy policy",
      });
    }

    // Password confirmation
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    // Check password complexity
    const passwordError = getPasswordComplexityError(password);

    if (passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError,
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check whether email is already registered
    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      if (!existingUser.isVerified) {
        let emailSent = getCooldownRemainingMs(existingUser.otpExpiresAt) > 0;

        if (!emailSent) {
          emailSent = await sendOtpSafely(existingUser);
        }

        return res.status(200).json({
          success: true,
          requiresVerification: true,
          emailSent,
          email: existingUser.email,
          message: "This email is already registered but not verified. We've sent a code.",
        });
      }

      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid phone number",
      });
    }

    if (await isPhoneTaken(normalizedPhone)) {
      return res.status(409).json({
        success: false,
        message: "This phone number is already in use",
      });
    }

    // Signup always uses Basic; client-supplied plan/payment fields are ignored.
    const selectedPackage = await prisma.package.findUnique({
      where: {
        providerType_tier: {
          providerType: "BUSINESS",
          tier: "BASIC",
        },
      },
    });

    if (!selectedPackage || Number(selectedPackage.monthlyPrice) !== 0) {
      return res.status(400).json({
        success: false,
        message: "Selected package is not available",
      });
    }

    // Split contact name into first and last name
    const nameParts = contactName.trim().split(/\s+/);

    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || null;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // PAID is the existing schema convention for a free plan; no charge occurs.
    const paymentStatus = "PAID";

    const now = new Date();

    // Calculate next monthly billing date
    const nextBillingDate = new Date(now);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    // Create user, business and subscription together
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          firstName,
          lastName,
          phone: normalizedPhone,
          role: "BUSINESS_OWNER",
          termsAcceptedAt: now,
        },
      });

      const business = await tx.business.create({
        data: {
          ownerUserId: user.id,
          name: businessName.trim(),
          category: category.trim(),
          staffSize: staffSize.trim(),
          email: normalizedEmail,
          phone: normalizedPhone,
          address: address.trim(),
        },
      });

      const subscription = await tx.providerSubscription.create({
        data: {
          businessId: business.id,
          packageId: selectedPackage.id,
          status: "ACTIVE",

          // Snapshot package limits at the time of subscription
          dailyAppointmentLimit:
            selectedPackage.dailyAppointmentLimit,
          maxStaff: selectedPackage.maxStaff,

          billingStartDate: now,
          nextBillingDate,
          paymentStatus,
        },
      });

      return {
        user,
        business,
        subscription,
      };
    });

    const emailSent = await sendOtpSafely(result.user);

    return res.status(201).json({
      success: true,
      requiresVerification: true,
      emailSent,
      message: "Business account created successfully",
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        phone: result.user.phone,
        role: result.user.role,
        createdAt: result.user.createdAt,
      },
      business: {
        id: result.business.id,
        name: result.business.name,
        category: result.business.category,
        staffSize: result.business.staffSize,
        email: result.business.email,
        phone: result.business.phone,
        address: result.business.address,
        createdAt: result.business.createdAt,
      },
      subscription: {
        id: result.subscription.id,
        packageId: result.subscription.packageId,
        status: result.subscription.status,
        dailyAppointmentLimit:
          result.subscription.dailyAppointmentLimit,
        maxStaff: result.subscription.maxStaff,
        billingStartDate: result.subscription.billingStartDate,
        nextBillingDate: result.subscription.nextBillingDate,
        paymentStatus: result.subscription.paymentStatus,
      },
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        success: false,
        message: "An account with this email or phone number already exists",
      });
    }

    console.error("Business registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating the business account",
    });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: "Email and code are required",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        success: false,
        message: "Server authentication configuration error",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
      include: USER_ROLE_INCLUDE,
    });

    const invalid = () =>
      res.status(400).json({
        success: false,
        message: "Invalid or expired code",
      });

    if (!user) return invalid();

    if (user.isVerified) {
      return res.status(409).json({
        success: false,
        message: "This email is already verified. Please log in.",
      });
    }

    if (!user.otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return invalid();
    }

    if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Please request a new code.",
      });
    }

    if (!otpMatches(String(code).trim(), user.otpCode)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { otpAttempts: { increment: 1 } },
      });

      return invalid();
    }

    const verifiedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        otpCode: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      },
      include: USER_ROLE_INCLUDE,
    });

    // Log them straight in after verifying
    setSessionCookie(res, verifiedUser);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      user: serializeUser(verifiedUser),
    });
  } catch (error) {
    console.error("Verify OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while verifying your email",
    });
  }
};

export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || !EMAIL_REGEX.test(String(email).trim())) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
    });

    // Same response whether or not the account exists
    if (!user || user.isVerified) {
      return res.status(200).json({
        success: true,
        message: "If this account needs verification, a new code has been sent",
      });
    }

    const remainingMs = getCooldownRemainingMs(user.otpExpiresAt);

    if (remainingMs > 0) {
      const retryAfterSeconds = Math.ceil(remainingMs / 1000);

      return res.status(429).json({
        success: false,
        message: `Please wait ${retryAfterSeconds}s before requesting another code`,
        retryAfterSeconds,
      });
    }

    const sent = await sendOtpSafely(user);

    if (!sent) {
      return res.status(500).json({
        success: false,
        message: "We couldn't send the email. Please try again shortly.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "A new code has been sent",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while sending the code",
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || !EMAIL_REGEX.test(String(email).trim())) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
    });

    if (user && getCooldownRemainingMs(user.passwordResetExpiresAt) === 0) {
      try {
        await issuePasswordResetOtp(user);
      } catch (error) {
        console.error("Failed to send password reset email:", error);
      }
    }

    return res.status(200).json({
      success: true,
      message: "If an account exists for this email, we've sent a reset code",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while processing your request",
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, code, password, confirmPassword } = req.body;

    if (!email || !code || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, code and new password are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    const passwordError = getPasswordComplexityError(password);

    if (passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError,
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
    });

    const invalid = () =>
      res.status(400).json({
        success: false,
        message: "Invalid or expired code",
      });

    if (
      !user ||
      !user.passwordResetCode ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt < new Date()
    ) {
      return invalid();
    }

    if (user.passwordResetAttempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Please request a new code.",
      });
    }

    if (!otpMatches(String(code).trim(), user.passwordResetCode)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetAttempts: { increment: 1 } },
      });

      return invalid();
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetCode: null,
        passwordResetExpiresAt: null,
        passwordResetAttempts: 0,
        isVerified: true,
        otpCode: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now sign in.",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while resetting your password",
    });
  }
};

export const acceptStaffInvitation = async (req: Request, res: Response) => {
  const { token, password, confirmPassword } = req.body as Record<string, unknown>;
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return res.status(400).json({ success: false, message: "This invitation link is invalid or expired" });
  }
  if (typeof password !== "string" || typeof confirmPassword !== "string") {
    return res.status(400).json({ success: false, message: "Password and confirmation are required" });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: "Passwords do not match" });
  }

  const passwordError = getPasswordComplexityError(password);
  if (passwordError) {
    return res.status(400).json({ success: false, message: passwordError });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const tokenHash = hashStaffInvitationToken(token);
    await prisma.$transaction(async (tx) => {
      const invitation = await tx.staffInvitation.findUnique({ where: { tokenHash } });
      const now = new Date();
      if (!invitation || invitation.acceptedAt || invitation.expiresAt <= now) {
        throw new Error("STAFF_INVITATION_INVALID");
      }

      if (await tx.user.findUnique({ where: { email: invitation.email }, select: { id: true } })) {
        throw new Error("STAFF_INVITATION_ACCOUNT_EXISTS");
      }

      const invitedServices = invitation.serviceIds.length > 0
        ? await tx.service.findMany({
            where: { businessId: invitation.businessId, id: { in: invitation.serviceIds } },
            select: { id: true, active: true, staffAssignments: { select: { id: true } } },
          })
        : [];
      if (invitedServices.length !== invitation.serviceIds.length) {
        throw new Error("STAFF_INVITATION_SERVICES_CHANGED");
      }

      const claimed = await tx.staffInvitation.updateMany({
        where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: now } },
        data: { acceptedAt: now },
      });
      if (claimed.count !== 1) {
        throw new Error("STAFF_INVITATION_INVALID");
      }

      const user = await tx.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          firstName: invitation.firstName,
          lastName: invitation.lastName,
          phone: invitation.phone,
          role: "BUSINESS_STAFF",
          isVerified: true,
        },
      });
      const staff = await tx.businessStaff.create({
        data: {
          businessId: invitation.businessId,
          userId: user.id,
          title: invitation.title,
        },
      });
      if (invitation.serviceIds.length > 0) {
        await tx.staffService.createMany({
          data: invitation.serviceIds.map((serviceId) => ({ staffId: staff.id, serviceId })),
        });
        const newlyAssignedServiceIds = invitedServices
          .filter((service) => !service.active && service.staffAssignments.length === 0)
          .map((service) => service.id);
        if (newlyAssignedServiceIds.length > 0) {
          await tx.service.updateMany({
            where: { businessId: invitation.businessId, id: { in: newlyAssignedServiceIds } },
            data: { active: true },
          });
        }
      }
    }, { maxWait: 15_000, timeout: 20_000 });

    return res.status(201).json({
      success: true,
      message: "Your staff account is ready. You can now sign in.",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "STAFF_INVITATION_INVALID") {
      return res.status(400).json({ success: false, message: "This invitation link is invalid or expired" });
    }
    if (error instanceof Error && error.message === "STAFF_INVITATION_ACCOUNT_EXISTS") {
      return res.status(409).json({ success: false, message: "An account already exists for this email address" });
    }
    if (error instanceof Error && error.message === "STAFF_INVITATION_SERVICES_CHANGED") {
      return res.status(409).json({ success: false, message: "A selected service is no longer available. Ask the business owner to send a new invitation." });
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return res.status(409).json({ success: false, message: "An account already exists for this email or phone number" });
    }

    if (error && typeof error === "object" && "code" in error && error.code === "P2028") {
      console.error("Staff invitation transaction could not start:", error);
      return res.status(503).json({ success: false, message: "The server is temporarily busy. Please try again." });
    }

    console.error("Staff invitation acceptance error:", error);
    return res.status(500).json({ success: false, message: "Unable to accept this invitation" });
  }
};