const Organization = require("../models/Organization");

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
    const organizations = await Organization.find({ status: "active" })
      .select("name _id")
      .sort({ name: 1 });
    res.json({ organizations });
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

    res.json({ organization });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  slugify,
  listOrganizations,
  getMyOrganization,
  updateMyOrganization,
};
