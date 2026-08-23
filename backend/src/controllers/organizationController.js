const Organization = require("../models/Organization");
const OrganizationMember = require("../models/OrganizationMember");
const User = require("../models/User");
const { audit } = require("../utils/audit");
const {
  parsePagination,
  buildSearch,
  buildFilters,
  parseSort,
  paginate,
} = require("../utils/query");

const slugify = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// Public: lets registration forms populate an "organization" dropdown without
// exposing anything beyond name/id for orgs that aren't the caller's own.
const listOrganizations = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });

    const filter = {
      status: "active",
      ...buildSearch(req.query.search, ["name", "slug", "city", "country"]),
    };
    const sort = parseSort(req.query.sort, ["name", "createdAt"], { name: 1 });

    const { data, pagination } = await paginate(Organization, {
      filter,
      page,
      limit,
      skip,
      sort,
      select: "name _id slug city country status",
    });
    res.json({ organizations: data, pagination });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyOrganization = async (req, res) => {
  try {
    if (!req.user.organization) {
      return res.status(404).json({ message: "No organization assigned" });
    }
    const organization = await Organization.findById(
      req.user.organization
    ).populate("owner", "name email");
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }
    res.json({ organization });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateMyOrganization = async (req, res) => {
  try {
    const { name, status } = req.body;
    const organization = await Organization.findById(req.user.organization);
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    if (name) organization.name = name;
    if (status) organization.status = status;
    await organization.save();

    audit({
      req,
      action: "organization_updated",
      resourceType: "Organization",
      resourceId: organization._id,
      metadata: { name, status },
    });

    res.json({ organization });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Organization membership (tenant-level roles, report §15) -------------

// Members of the caller's organization, with their org-level roles.
const listMembers = async (req, res) => {
  try {
    const orgId = req.user.organization;
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });

    const filter = {
      organization: orgId,
      status: { $ne: "removed" },
      ...buildFilters(req.query, ["roleInOrg", "status"]),
    };

    // Search across the member's user record (name/email) — resolve matching
    // user ids first, then scope the membership query to them.
    const search = String(req.query.search || "").trim();
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(safe, "i");
      const users = await User.find({ $or: [{ name: rx }, { email: rx }] })
        .select("_id")
        .lean();
      filter.user = { $in: users.map((u) => u._id) };
    }

    const sort = parseSort(req.query.sort, ["roleInOrg", "joinedAt"], {
      roleInOrg: 1,
      joinedAt: 1,
    });

    const { data, pagination } = await paginate(OrganizationMember, {
      filter,
      page,
      limit,
      skip,
      sort,
      populate: { path: "user", select: "name email role" },
    });

    res.json({
      members: data.map((m) => ({
        _id: m._id,
        userId: m.user?._id,
        name: m.user?.name,
        email: m.user?.email,
        systemRole: m.user?.role,
        roleInOrg: m.roleInOrg,
        status: m.status,
        joinedAt: m.joinedAt,
      })),
      pagination,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add an existing platform user to the organization (by email) and grant an
// org-level role. Only org admins (requireOrgAdmin) may do this.
const addMember = async (req, res) => {
  try {
    const { email, roleInOrg = "member" } = req.body;
    if (!email) {
      return res.status(400).json({ message: "email is required" });
    }
    if (!["owner", "admin", "manager", "member"].includes(roleInOrg)) {
      return res.status(400).json({ message: "Invalid roleInOrg" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "No user found with that email" });
    }

    const orgId = req.user.organization;
    // Re-adding someone who was removed: revive the membership.
    let member = await OrganizationMember.findOne({ organization: orgId, user: user._id });
    if (member?.status === "removed") {
      member.status = "active";
      member.roleInOrg = roleInOrg;
    } else if (member) {
      return res.status(409).json({ message: "User is already a member" });
    } else {
      member = await OrganizationMember.create({
        organization: orgId,
        user: user._id,
        roleInOrg,
        invitedBy: req.user._id,
      });
    }
    await member.save();

    // Keep the user's tenant pointer in sync.
    if (!user.organization) {
      user.organization = orgId;
      await user.save();
    }

    audit({
      req,
      action: "member_added",
      resourceType: "Organization",
      resourceId: orgId,
      metadata: { userId: user._id, email, roleInOrg },
    });

    res.status(201).json({ member });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateMemberRole = async (req, res) => {
  try {
    const { roleInOrg } = req.body;
    if (!["owner", "admin", "manager", "member"].includes(roleInOrg)) {
      return res.status(400).json({ message: "Invalid roleInOrg" });
    }
    const orgId = req.user.organization;
    const member = await OrganizationMember.findOne({
      organization: orgId,
      user: req.params.userId,
      status: { $ne: "removed" },
    });
    if (!member) {
      return res.status(404).json({ message: "Membership not found" });
    }
    if (member.roleInOrg === "owner" && req.user._id.toString() !== member.user.toString()) {
      return res.status(403).json({ message: "Only the owner can change the owner role" });
    }

    member.roleInOrg = roleInOrg;
    await member.save();

    audit({
      req,
      action: "member_role_changed",
      resourceType: "Organization",
      resourceId: orgId,
      metadata: { userId: req.params.userId, roleInOrg },
    });

    res.json({ member });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeMember = async (req, res) => {
  try {
    const orgId = req.user.organization;
    const member = await OrganizationMember.findOne({
      organization: orgId,
      user: req.params.userId,
      status: { $ne: "removed" },
    });
    if (!member) {
      return res.status(404).json({ message: "Membership not found" });
    }
    if (member.roleInOrg === "owner") {
      return res.status(403).json({ message: "The owner cannot be removed" });
    }
    if (req.user._id.toString() === member.user.toString()) {
      return res.status(403).json({ message: "You cannot remove yourself" });
    }

    member.status = "removed";
    await member.save();

    audit({
      req,
      action: "member_removed",
      resourceType: "Organization",
      resourceId: orgId,
      metadata: { userId: req.params.userId },
    });

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  slugify,
  listOrganizations,
  getMyOrganization,
  updateMyOrganization,
  listMembers,
  addMember,
  updateMemberRole,
  removeMember,
};
