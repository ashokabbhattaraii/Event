const User = require("../models/User");
const Event = require("../models/Event");
const Organization = require("../models/Organization");
const OrganizationMember = require("../models/OrganizationMember");
const Session = require("../models/Session");
const { audit } = require("../utils/audit");
const {
  parsePagination,
  buildSearch,
  buildFilters,
  parseSort,
  paginate,
} = require("../utils/query");

// Admin-only. An org admin (admin with an organization) is scoped to their
// own tenant; the OVERALL system admin (role "admin", no organization) sees
// every tenant (PDF: "Administrators have control over all the tenant
// companies on the platform").
const listOrgUsers = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const isSystemAdmin = !req.user.organization;
    // Org admins always see their own tenant. The system admin (no org) can
    // narrow to a single tenant via ?organizationId — otherwise they see every
    // account on the platform.
    const orgId = isSystemAdmin && req.query.organizationId ? req.query.organizationId : req.user.organization;
    const filter = {
      ...(orgId ? { organization: orgId } : {}),
      ...buildSearch(req.query.search, ["name", "email"]),
      ...buildFilters(req.query, ["role"]),
    };
    const sort = parseSort(req.query.sort, ["name", "createdAt"], {
      createdAt: -1,
    });

    const { data, pagination } = await paginate(User, {
      filter,
      page,
      limit,
      skip,
      sort,
    });
    res.json({ users: data, pagination });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Org admin creates user credentials for their own tenant (name/email/
// password + role — full RBAC from day one). Self-service registration is
// attendee-only (register endpoint), so privileged accounts must be created
// here by the org admin or the system admin.
const createUser = async (req, res) => {
  try {
    const { name, email, password, role = "attendee", organizationId } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    if (!["admin", "organizer", "attendee"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "User already exists" });
    }

    const isSystemAdmin = !req.user.organization;

    // RBAC: only the system admin may grant the admin role — an org admin
    // creating more admins is privilege escalation (it bypasses the system
    // admin's org-approval authority). Org admins provision organizer/
    // attendee accounts for their own tenant.
    if (role === "admin" && !isSystemAdmin) {
      return res
        .status(403)
        .json({ message: "Only the system admin can create organization admins" });
    }

    // Tenant resolution: org admins always target their own org; the system
    // admin must name one (every created account belongs to a tenant — the
    // platform's sole org-less user is the system admin itself).
    let orgId = req.user.organization;
    if (isSystemAdmin) {
      if (!organizationId) {
        return res
          .status(400)
          .json({ message: "organizationId is required when creating tenant users" });
      }
      orgId = organizationId;
    }
    const org = await Organization.findById(orgId);
    if (!org || org.status !== "active") {
      return res.status(400).json({ message: "Invalid or inactive organization" });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      organization: org._id,
    });

    // Keep the org-level membership in sync so requireOrgAdmin sees the
    // account with the right tenant role immediately.
    await OrganizationMember.create({
      organization: org._id,
      user: user._id,
      roleInOrg: role === "admin" ? "admin" : "member",
      invitedBy: req.user._id,
    });

    audit({
      req,
      action: "user_created",
      resourceType: "User",
      resourceId: user._id,
      metadata: { email, role, by: req.user._id, organization: org._id },
    });

    res.status(201).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Org admins can only touch their own tenant; the system admin (no org)
    // manages accounts across the platform.
    if (
      req.user.organization &&
      user.organization?.toString() !== req.user.organization.toString()
    ) {
      return res.status(403).json({ message: "User belongs to a different organization" });
    }
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You can't change your own role" });
    }
    // No privilege escalation: granting the admin role is the system admin's
    // call (org admins may still manage organizer/attendee roles).
    if (role === "admin" && req.user.organization) {
      return res
        .status(403)
        .json({ message: "Only the system admin can grant the admin role" });
    }
    // The tenant owner is the org's root of trust — a misclick here would
    // permanently lock the org out of admin privileges.
    const org = await Organization.findById(user.organization);
    if (org && org.owner?.toString() === user._id.toString()) {
      return res.status(400).json({ message: "The organization owner's role can't be changed" });
    }
    const previousRole = user.role;
    user.role = role;
    // A role change invalidates every outstanding access token (tokenVersion
    // bump) and refresh session, so the user is logged out everywhere and
    // must re-authenticate — no stale sessions keep running with the old
    // role, and the client UI is forced to pick up the new one.
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();
    await Session.updateMany({ user: user._id, revokedAt: null }, { revokedAt: new Date() });
    // Keep the org-level membership in sync with the system role so
    // requireOrgAdmin doesn't keep treating a demoted admin as a tenant admin.
    if (user.organization) {
      await OrganizationMember.updateOne(
        { organization: user.organization, user: user._id, status: { $ne: "removed" } },
        { roleInOrg: role === "admin" ? "admin" : "member" },
        { upsert: false }
      );
    }
    audit({
      req,
      action: "role_changed",
      resourceType: "User",
      resourceId: user._id,
      metadata: { from: previousRole, to: role, by: req.user._id, sessionsRevoked: true },
    });
    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Any authenticated user can save their own location (captured from the
// browser on login). Powers distance-based recommendations and chatbot.
// Omitting lat/lng clears the saved location entirely.
const updateMyLocation = async (req, res) => {
  try {
    const { lat, lng, city } = req.body;

    if (lat == null || lng == null) {
      req.user.location = undefined;
      await req.user.save();
      return res.json({ location: null });
    }

    req.user.location = {
      lat,
      lng,
      city: city || req.user.location?.city,
      updatedAt: new Date(),
    };
    await req.user.save();
    res.json({ location: req.user.location });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Any authenticated user (attendee, organizer, admin) can update their own
// display name from Settings. Email stays immutable — it's the account's
// identity (and Google accounts have no password to verify a change with).
const updateMyProfile = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (name.trim().length > 80) {
      return res.status(400).json({ message: "Name is too long (max 80 characters)" });
    }
    req.user.name = name.trim();
    await req.user.save();
    res.json({
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        organization: req.user.organization,
        location: req.user.location,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Password change for local accounts. Google-linked accounts have no
// password (they authenticate via googleId), so there's nothing to compare
// or update — the settings UI hides the card for them.
const updateMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (req.user.googleId) {
      return res
        .status(400)
        .json({ message: "Google accounts don't use a password — sign in with Google" });
    }
    if (!currentPassword) {
      return res.status(400).json({ message: "Current password is required" });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    // The password field is select:false, so fetch it explicitly — a
    // missing password would make comparePassword throw instead of failing
    // the check.
    const fullUser = await User.findById(req.user._id).select("+password");
    const ok = await fullUser.comparePassword(currentPassword);
    if (!ok) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    fullUser.password = newPassword;
    // Same hardening as role change / password reset: new password means old
    // JWTs and refresh sessions are dead — every device re-authenticates.
    fullUser.tokenVersion = (fullUser.tokenVersion ?? 0) + 1;
    await fullUser.save();
    await Session.updateMany(
      { user: fullUser._id, revokedAt: null },
      { revokedAt: new Date() }
    );
    res.json({ message: "Password updated. Please log in again." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrgStats = async (req, res) => {
  try {
    // System admin (no org) → platform-wide stats; org admin → own tenant.
    const scope = req.user.organization ? { organization: req.user.organization } : {};
    const [userCount, eventCount, roleRows] = await Promise.all([
      User.countDocuments(scope),
      Event.countDocuments(scope),
      User.aggregate([
        { $match: scope },
        { $group: { _id: "$role", count: { $sum: 1 } } },
      ]),
    ]);
    const roleCounts = { admin: 0, organizer: 0, attendee: 0 };
    roleRows.forEach((r) => {
      if (r._id in roleCounts) roleCounts[r._id] = r.count;
    });
    res.json({ userCount, eventCount, roleCounts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update the current user's reminder email preference.
const updateReminderPreference = async (req, res) => {
  try {
    const { reminderEmail } = req.body;
    if (typeof reminderEmail !== "boolean") {
      return res.status(400).json({ message: "reminderEmail must be a boolean" });
    }
    req.user.reminderEmail = reminderEmail;
    await req.user.save();
    res.json({ reminderEmail: req.user.reminderEmail });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  listOrgUsers,
  createUser,
  updateUserRole,
  updateMyLocation,
  updateMyProfile,
  updateMyPassword,
  updateReminderPreference,
  getOrgStats,
};
