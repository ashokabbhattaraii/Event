const mongoose = require("mongoose");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const Session = require("../models/Session");
const Organization = require("../models/Organization");
const OrganizationMember = require("../models/OrganizationMember");
const generateToken = require("../utils/generateToken");
const { slugify } = require("./organizationController");
const { audit } = require("../utils/audit");
const { sendMail } = require("../utils/email");
const {
  generateRefreshToken,
  generateEmailToken,
  hashToken,
  parseDuration,
} = require("../utils/tokens");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const REFRESH_TTL_MS = parseDuration(process.env.JWT_REFRESH_EXPIRES_IN, 30 * 24 * 60 * 60 * 1000);
const EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// Emails that are automatically granted the admin role on sign-in.
// Configured via ADMIN_EMAILS; falls back to the project's default admin.
const ADMIN_EMAILS = (
  process.env.ADMIN_EMAILS || "anjaliimiishra321@gmail.com"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const isAdminEmail = (email) => ADMIN_EMAILS.includes((email || "").toLowerCase());

// Admin routes are tenant-scoped, so an admin must belong to an organization.
// Attach the given user to the first existing org, creating a default one if
// none exists yet. Mutates the user document; caller is responsible for saving.
const assignDefaultOrg = async (user) => {
  if (user.organization) return;
  let org = await Organization.findOne({ status: "active" }).sort({ createdAt: 1 });
  if (!org) {
    org = await Organization.create({
      name: "EventNexus",
      slug: "eventnexus",
      owner: user._id,
    });
  }
  user.organization = org._id;
};

const serializeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  organization: user.organization,
  location: user.location,
  // True when the account was created via Google sign-in — such accounts
  // have no password, so the UI hides the "change password" card.
  googleAccount: Boolean(user.googleId),
  // True once the email address has been confirmed (report §7). Google
  // accounts are verified on creation; local accounts via the link in the
  // verification email.
  emailVerified: Boolean(user.emailVerifiedAt),
});

// Create a refresh-token session for the user and return the plaintext
// token (the only time it's ever visible; the DB stores the hash).
const createSession = async (user, req) => {
  const refreshToken = generateRefreshToken();
  await Session.create({
    user: user._id,
    refreshTokenHash: hashToken(refreshToken),
    ip: req.ip,
    userAgent: req.get("user-agent")?.slice(0, 300),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return refreshToken;
};

// Issue a verification token + email a link (dev mode: logged to console /
// Mail collection). Regenerating the token invalidates the previous one,
// so a leaked link expires as soon as a new one is requested.
const sendVerificationEmail = async (user) => {
  const token = generateEmailToken();
  user.emailVerificationToken = hashToken(token);
  user.emailVerificationExpiresAt = new Date(Date.now() + EMAIL_TOKEN_TTL_MS);
  await user.save();

  const link = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  await sendMail({
    to: user.email,
    subject: "Verify your EventNexus email",
    template: "verify-email",
    text: `Hi ${user.name},\n\nVerify your email to finish setting up your account:\n${link}\n\nThis link expires in 24 hours.`,
    metadata: { link, token },
  });
};

const register = async (req, res) => {
  try {
    const { name, email, password, role, organizationId, organizationName } =
      req.body;

    // Public self-service registration is attendee-only. Organizer/admin
    // roles are privileged (event management, tenant administration), so
    // they're granted by an existing admin (users/:id/role) or via the
    // ADMIN_EMAILS allowlist on Google sign-in — never chosen on a form.
    // Before this fix, anyone could register as an "organizer" (or even
    // "admin" with a made-up org name) and get elevated permissions in an
    // existing tenant.
    const requestedRole = role || "attendee";
    if (
      (requestedRole === "admin" || requestedRole === "organizer") &&
      !isAdminEmail(email)
    ) {
      return res.status(403).json({
        message:
          "Organizer/admin registration is invite-only. Contact your organization admin to assign this role.",
      });
    }
    const resolvedRole =
      requestedRole === "admin" || requestedRole === "organizer"
        ? requestedRole
        : "attendee";

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    let organization;

    if (resolvedRole === "admin") {
      // Admin sign-up creates a brand-new tenant; the admin becomes its owner.
      // The tenant starts "pending" — the system admin must approve it before
      // anyone (including this admin) can log in. (Self-service admin
      // sign-up is legacy; orgRegister is the intended onboarding flow.)
      if (!organizationName) {
        return res
          .status(400)
          .json({ message: "Organization name is required for admin sign-up" });
      }
      const slug = slugify(organizationName);
      const slugTaken = await Organization.findOne({ slug });
      if (slugTaken) {
        return res
          .status(400)
          .json({ message: "An organization with that name already exists" });
      }
      // Owner is set after the user is created (chicken-and-egg on the ref).
      organization = await Organization.create({
        name: organizationName,
        slug,
        status: "pending",
        owner: new mongoose.Types.ObjectId(),
      });
    } else {
      // Organizer/attendee sign-up joins an existing tenant.
      if (!organizationId) {
        return res.status(400).json({ message: "Organization is required" });
      }
      organization = await Organization.findById(organizationId);
      if (!organization || organization.status !== "active") {
        return res.status(400).json({ message: "Invalid organization" });
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      role: resolvedRole,
      organization: organization._id,
      // Only the ADMIN_EMAILS allowlist can reach the admin branch, so record
      // the grant — once granted, allowlist logins never re-promote a
      // deliberately demoted account (see googleLogin).
      adminGrantedAt: resolvedRole === "admin" ? new Date() : undefined,
    });

    if (resolvedRole === "admin") {
      organization.owner = user._id;
      await organization.save();
    }

    const token = generateToken(user._id);
    const refreshToken = await createSession(user, req);

    // A fresh local account must confirm its email before the platform is
    // fully usable (report §7). The verification link is emailed (dev mode:
    // console + Mail collection).
    await sendVerificationEmail(user).catch((err) =>
      console.error("[verify-email] failed to send:", err.message)
    );

    audit({
      req,
      user,
      organization,
      action: "register",
      resourceType: "User",
      resourceId: user._id,
      metadata: { role: resolvedRole, via: "email" },
    });
    if (resolvedRole === "admin") {
      audit({
        req,
        user,
        organization,
        action: "organization_created",
        resourceType: "Organization",
        resourceId: organization._id,
        metadata: { name: organization.name },
      });
    }

    res.status(201).json({ user: serializeUser(user), token, refreshToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Organization self-registration (approval workflow) ----------------------
// An org admin registers the organization with full details → status
// "pending". The overall system admin verifies and approves it; only then can
// the org's users log in (see login gate below). This is the ONLY way to
// create a tenant — there is no open "create org" endpoint anymore.
const orgRegister = async (req, res) => {
  try {
    const {
      orgName,
      orgEmail,
      orgPhone,
      orgAddress,
      orgCity,
      orgCountry,
      orgType,
      orgDescription,
      orgWebsite,
      adminName,
      adminEmail,
      adminPassword,
    } = req.body;

    if (!orgName || !adminName || !adminEmail || !adminPassword) {
      return res
        .status(400)
        .json({ message: "Organization name and admin credentials are required" });
    }
    if (adminPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // The org admin is always created as an "admin" within their own tenant.
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      return res.status(400).json({ message: "An account with that email already exists" });
    }
    const slug = slugify(orgName);
    if (await Organization.findOne({ slug })) {
      return res.status(400).json({ message: "An organization with that name already exists" });
    }

    // Owner set after the user is created (chicken-and-egg on the ref).
    const organization = await Organization.create({
      name: orgName,
      slug,
      email: orgEmail,
      phone: orgPhone,
      address: orgAddress,
      city: orgCity,
      country: orgCountry,
      type: orgType,
      description: orgDescription,
      website: orgWebsite,
      status: "pending",
      owner: new mongoose.Types.ObjectId(),
    });

    const user = await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: "admin",
      organization: organization._id,
    });
    organization.owner = user._id;
    await organization.save();

    await OrganizationMember.create({
      user: user._id,
      organization: organization._id,
      roleInOrg: "owner",
      status: "active",
    });

    // Verification email (dev mode: console + Mail collection).
    await sendVerificationEmail(user).catch((err) =>
      console.error("[verify-email] failed to send:", err.message)
    );

    audit({
      req,
      user,
      organization,
      action: "org_registered",
      resourceType: "Organization",
      resourceId: organization._id,
      metadata: { name: orgName, adminEmail },
    });

    res.status(201).json({
      message:
        "Organization registration submitted. A system admin will review and approve it — you'll be able to log in once approved.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Block logins while the user's org hasn't been approved. The org admin can
// register and create their account, but the tenant is dark until the
// system admin approves it — the whole point of the approval gate. The
// system admin itself (role "admin", no organization) is never gated.
const assertOrgApproved = async (user) => {
  if (!user.organization) return null;
  const org = await Organization.findById(user.organization).lean();
  if (!org) return null;
  if (org.status === "pending") {
    return {
      status: 403,
      message:
        "Your organization is awaiting approval by a system admin. You'll be able to log in once it's verified.",
      code: "ORG_PENDING",
    };
  }
  if (org.status === "rejected") {
    return {
      status: 403,
      message:
        org.rejectionReason
          ? `Your organization registration was rejected: ${org.rejectionReason}`
          : "Your organization registration was rejected. Contact support for details.",
      code: "ORG_REJECTED",
    };
  }
  if (org.status === "suspended") {
    return {
      status: 403,
      message: "Your organization is suspended. Contact support.",
      code: "ORG_SUSPENDED",
    };
  }
  return null;
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const gate = await assertOrgApproved(user);
    if (gate) {
      return res.status(gate.status).json({ message: gate.message, code: gate.code });
    }

    const token = generateToken(user._id, user.tokenVersion ?? 0);
    const refreshToken = await createSession(user, req);

    audit({
      req,
      user,
      organization: user.organization ? { _id: user.organization } : undefined,
      action: "login",
      resourceType: "User",
      resourceId: user._id,
      metadata: { via: "email" },
    });

    res.json({ user: serializeUser(user), token, refreshToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const googleLogin = async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res
        .status(500)
        .json({ message: "Google login is not configured on the server" });
    }

    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: "Missing Google credential" });
    }

    // Verify the ID token came from Google and was issued for our client.
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, email_verified: emailVerified } = payload;

    if (!emailVerified) {
      return res
        .status(401)
        .json({ message: "Google account email is not verified" });
    }

    const admin = isAdminEmail(email);

    // Find an existing account by email, otherwise create one.
    let user = await User.findOne({ email });
    if (user) {
      let changed = false;
      // Link the Google identity to a pre-existing local account.
      if (!user.googleId) {
        user.googleId = googleId;
        changed = true;
      }
      // Promote allowlisted emails to admin — but only ONCE (adminGrantedAt).
      // A deliberate demotion by another admin sticks; without this guard,
      // every Google sign-in would silently re-promote the demoted user.
      if (admin && !user.adminGrantedAt && user.role !== "admin") {
        user.role = "admin";
        user.adminGrantedAt = new Date();
        changed = true;
      }
      // Admins must have an organization for tenant-scoped routes to work.
      if (user.role === "admin" && !user.organization) {
        await assignDefaultOrg(user);
        changed = true;
      }
      if (changed) await user.save();
    } else {
      user = new User({
        name: name || email.split("@")[0],
        email,
        googleId,
        role: admin ? "admin" : "attendee",
        adminGrantedAt: admin ? new Date() : undefined,
      });
      if (admin) await assignDefaultOrg(user);
      await user.save();
    }

    const gate = await assertOrgApproved(user);
    if (gate) {
      return res.status(gate.status).json({ message: gate.message, code: gate.code });
    }

    const token = generateToken(user._id, user.tokenVersion ?? 0);
    const refreshToken = await createSession(user, req);

    audit({
      req,
      user,
      organization: user.organization ? { _id: user.organization } : undefined,
      action: "login",
      resourceType: "User",
      resourceId: user._id,
      metadata: { via: "google" },
    });

    res.json({ user: serializeUser(user), token, refreshToken });
  } catch (error) {
    // Log the real cause; the client still gets a generic message so no
    // internal details (DB names, stack traces) leak through.
    console.error("[google] login failed:", error.message);
    res.status(401).json({ message: "Google authentication failed" });
  }
};

const getMe = async (req, res) => {
  res.json({ user: serializeUser(req.user) });
};

// --- Refresh-token rotation (report §7) ------------------------------------
// Each refresh rotates: the presented token's hash is checked against the
// stored one, then immediately replaced with a new token+hash pair. If the
// presented hash no longer matches (reuse — the old token was replayed), the
// session is treated as stolen: every session for that user is revoked.
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: "refreshToken is required" });
    }
    const tokenHash = hashToken(refreshToken);

    const session = await Session.findOne({ refreshTokenHash: tokenHash }).select(
      "+refreshTokenHash +previousTokenHash"
    );
    if (!session) {
      // Not the current hash. Either a garbage token (401, no action) or a
      // REUSED pre-rotation token — the exact theft pattern rotation exists
      // to catch: the attacker presents the client's old token, and the
      // legitimate client's new token won't be current anymore either. When
      // the previous hash matches, revoke every session for the user (their
      // refresh chain is compromised) and refuse the rotation.
      const replayed = await Session.findOne({ previousTokenHash: tokenHash }).select("+previousTokenHash");
      if (replayed) {
        const victim = await User.findById(replayed.user);
        await Session.updateMany({ user: replayed.user, revokedAt: null }, { revokedAt: new Date() });
        console.warn(
          `[refresh] token reuse detected for ${replayed.user} — all sessions revoked`
        );
        audit({
          req,
          user: victim || undefined,
          action: "session_reuse_detected",
          resourceType: "User",
          resourceId: replayed.user,
          metadata: { ip: req.ip },
        });
      }
      return res.status(401).json({ message: "Invalid refresh token" });
    }
    if (session.revokedAt || session.expiresAt <= new Date()) {
      return res.status(401).json({ message: "Refresh token has expired or was revoked" });
    }

    const user = await User.findById(session.user);
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    // Rotation: mint a new token, swap the stored hash (the old token is
    // now dead on the server side, even though the client still holds it).
    // The just-replaced hash is kept as previousTokenHash for reuse
    // detection on the next request.
    const newRefreshToken = generateRefreshToken();
    session.previousTokenHash = session.refreshTokenHash;
    session.refreshTokenHash = hashToken(newRefreshToken);
    session.lastUsedAt = new Date();
    await session.save();

    audit({
      req,
      user,
      organization: user.organization ? { _id: user.organization } : undefined,
      action: "refresh",
      resourceType: "Session",
      resourceId: session._id,
    });

    res.json({ token: generateToken(user._id, user.tokenVersion ?? 0), refreshToken: newRefreshToken, user: serializeUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: "refreshToken is required" });
    }
    const session = await Session.findOne({ refreshTokenHash: hashToken(refreshToken) });
    if (session && !session.revokedAt) {
      session.revokedAt = new Date();
      await session.save();
    }
    // Idempotent: logging out with an already-revoked token still succeeds.
    res.json({ message: "Logged out" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// List the user's own active sessions (device/ip/browser) so they can see
// and revoke unrecognized logins.
const listSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ user: req.user._id, revokedAt: null })
      .sort({ lastUsedAt: -1 })
      .lean();
    res.json({
      sessions: sessions.map((s) => ({
        _id: s._id,
        ip: s.ip,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        lastUsedAt: s.lastUsedAt,
        expiresAt: s.expiresAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const revokeSession = async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    session.revokedAt = new Date();
    await session.save();
    audit({
      req,
      action: "session_revoked",
      resourceType: "Session",
      resourceId: session._id,
      metadata: { by: req.user._id },
    });
    res.json({ message: "Session revoked" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Email verification (report §7) ----------------------------------------
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ message: "Verification token is required" });
    }
    const user = await User.findOne({ emailVerificationToken: hashToken(token) }).select(
      "+emailVerificationToken"
    );
    if (!user || !user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
      return res.status(400).json({ message: "Verification link is invalid or has expired" });
    }
    user.emailVerifiedAt = new Date();
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();

    audit({
      req,
      user,
      organization: user.organization ? { _id: user.organization } : undefined,
      action: "email_verified",
      resourceType: "User",
      resourceId: user._id,
    });

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resendVerification = async (req, res) => {
  try {
    if (req.user.emailVerifiedAt) {
      return res.status(400).json({ message: "Email is already verified" });
    }
    await sendVerificationEmail(req.user);
    res.json({ message: "Verification email sent" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Password reset (report §7) --------------------------------------------
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal whether the account exists; same response either way.
      return res.json({ message: "If an account exists, a reset link has been sent" });
    }
    const token = generateEmailToken();
    user.passwordResetToken = hashToken(token);
    user.passwordResetExpiresAt = new Date(Date.now() + EMAIL_TOKEN_TTL_MS);
    await user.save();

    const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendMail({
      to: user.email,
      subject: "Reset your EventNexus password",
      template: "password-reset",
      text: `Hi ${user.name},\n\nA password reset was requested for your account. If that was you:\n${link}\n\nThis link expires in 24 hours. If you didn't request this, ignore this email — your password is unchanged.`,
      metadata: { link, token },
    });

    audit({
      req,
      user,
      organization: user.organization ? { _id: user.organization } : undefined,
      action: "password_reset_requested",
      resourceType: "User",
      resourceId: user._id,
    });

    res.json({ message: "If an account exists, a reset link has been sent" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: "token and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    const user = await User.findOne({ passwordResetToken: hashToken(token) }).select(
      "+passwordResetToken +password"
    );
    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      return res.status(400).json({ message: "Reset link is invalid or has expired" });
    }
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpiresAt = undefined;
    // A password reset means any previously-issued credentials are suspect:
    // bump the token version (kills every outstanding JWT) and revoke every
    // refresh session so all devices must re-authenticate.
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();
    await Session.updateMany({ user: user._id, revokedAt: null }, { revokedAt: new Date() });

    audit({
      req,
      user,
      organization: user.organization ? { _id: user.organization } : undefined,
      action: "password_reset",
      resourceType: "User",
      resourceId: user._id,
    });

    res.json({ message: "Password has been reset. Please log in again." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  orgRegister,
  login,
  googleLogin,
  getMe,
  refresh,
  logout,
  listSessions,
  revokeSession,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
};
