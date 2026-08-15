const Role = require("../models/Role");
const Permission = require("../models/Permission");
const { audit } = require("../utils/audit");
const { invalidateRoleCache, getRolePermissions } = require("../middleware/auth");

// All system roles + permission definitions (report §4/§18). The IAM API is
// admin-only; roles are editable per-tenant in a later phase (org roles).
const listRoles = async (req, res) => {
  try {
    const roles = await Role.find({})
      .sort({ scope: 1, name: 1 })
      .lean();
    res.json({
      roles: roles.map((r) => ({
        _id: r._id,
        name: r.name,
        description: r.description,
        scope: r.scope,
        permissions: r.permissions,
        // Legacy matrix fallback for roles not yet seeded — keeps the API
        // truthful even on a fresh database.
        effectivePermissions: getRolePermissions(r.name),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const listPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find({}).sort({ code: 1 }).lean();
    res.json({ permissions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a system role's permission list (admin). Caches are invalidated so
// the next requirePermission call sees the change immediately.
const updateRolePermissions = async (req, res) => {
  try {
    const { permissions } = req.body;
    if (!Array.isArray(permissions) || !permissions.every((p) => typeof p === "string")) {
      return res.status(400).json({ message: "permissions must be an array of codes" });
    }
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }
    if (role.scope === "system" && !["admin", "organizer"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins may edit system roles" });
    }

    role.permissions = [...new Set(permissions)];
    await role.save();
    invalidateRoleCache();

    audit({
      req,
      action: "role_updated",
      resourceType: "Role",
      resourceId: role._id,
      metadata: { role: role.name, permissions: role.permissions },
    });

    res.json({ role });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { listRoles, listPermissions, updateRolePermissions };
