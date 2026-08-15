const mongoose = require("mongoose");
const Organization = require("../models/Organization");
const User = require("../models/User");
const OrganizationMember = require("../models/OrganizationMember");
const { audit } = require("../utils/audit");
const { sendMail } = require("../utils/email");

// --- System-admin org approval console ---------------------------------------
// Organizations self-register with full details (orgRegister) and land in
// "pending". The OVERALL system admin (role "admin", no organization) reviews
// and approves/rejects them; only approved orgs' users can log in.

const listPendingOrgs = async (req, res) => {
  try {
    const { status = "pending" } = req.query;
    const valid = ["pending", "active", "rejected", "suspended"];
    const filter = valid.includes(status) ? { status } : { status: "pending" };

    const orgs = await Organization.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Attach the org admin (the user who registered the org) for each.
    const orgIds = orgs.map((o) => o._id);
    const admins = await User.find({ organization: { $in: orgIds }, role: "admin" })
      .select("name email")
      .lean();
    const adminByOrg = {};
    admins.forEach((a) => {
      // The system admin itself has role "admin" but no organization —
      // skip org-less admins.
      if (!a.organization) return;
      const key = a.organization.toString();
      if (!adminByOrg[key]) adminByOrg[key] = a;
    });

    res.json({
      organizations: orgs.map((o) => ({
        ...o,
        admin: adminByOrg[o._id.toString()] || null,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const approveOrg = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }
    if (org.status !== "pending") {
      return res.status(400).json({ message: `Organization is already ${org.status}` });
    }

    org.status = "active";
    org.approvedBy = req.user._id;
    org.approvedAt = new Date();
    org.rejectionReason = undefined;
    org.rejectedAt = undefined;
    await org.save();

    // The registering admin is the org's owner inside the tenant.
    const admin = await User.findById(org.owner);
    if (admin) {
      await OrganizationMember.updateOne(
        { user: admin._id, organization: org._id },
        { $set: { roleInOrg: "owner", status: "active" } },
        { upsert: true }
      );
      await sendMail({
        to: admin.email,
        subject: "Your organization has been approved",
        template: "org-approved",
        text: `Hi ${admin.name},\n\nGreat news — ${org.name} has been verified and approved. You can now log in to your EventNexus workspace and start building your team and events.\n\n${process.env.FRONTEND_URL}/login`,
        metadata: { org: org.name },
      }).catch((err) => console.error("[mail] approval notice failed:", err.message));
    }

    audit({
      req,
      action: "org_approved",
      resourceType: "Organization",
      resourceId: org._id,
      metadata: { name: org.name, by: req.user._id },
    });

    res.json({ message: "Organization approved", organization: org });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const rejectOrg = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "A rejection reason is required" });
    }

    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }
    if (org.status !== "pending") {
      return res.status(400).json({ message: `Organization is already ${org.status}` });
    }

    org.status = "rejected";
    org.rejectionReason = reason.trim();
    org.rejectedAt = new Date();
    org.approvedBy = req.user._id;
    await org.save();

    const admin = await User.findById(org.owner);
    if (admin) {
      await sendMail({
        to: admin.email,
        subject: "Your organization registration was not approved",
        template: "org-rejected",
        text: `Hi ${admin.name},\n\nUnfortunately ${org.name} could not be approved at this time.\n\nReason: ${reason}\n\nYou can edit your details and re-apply, or contact support.`,
        metadata: { org: org.name, reason },
      }).catch((err) => console.error("[mail] rejection notice failed:", err.message));
    }

    audit({
      req,
      action: "org_rejected",
      resourceType: "Organization",
      resourceId: org._id,
      metadata: { name: org.name, reason },
    });

    res.json({ message: "Organization rejected", organization: org });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { listPendingOrgs, approveOrg, rejectOrg };
