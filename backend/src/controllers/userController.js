const User = require("../models/User");
const Event = require("../models/Event");
const Organization = require("../models/Organization");
const {
  parsePagination,
  buildSearch,
  buildFilters,
  parseSort,
  paginate,
} = require("../utils/query");

// Admin-only, always scoped to the caller's own organization — an admin can
// never list or modify users belonging to another tenant.
const listOrgUsers = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {
      organization: req.user.organization,
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

const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.organization.toString() !== req.user.organization.toString()) {
      return res.status(403).json({ message: "User belongs to a different organization" });
    }
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You can't change your own role" });
    }
    // The tenant owner is the org's root of trust — a misclick here would
    // permanently lock the org out of admin privileges.
    const org = await Organization.findById(user.organization);
    if (org && org.owner?.toString() === user._id.toString()) {
      return res.status(400).json({ message: "The organization owner's role can't be changed" });
    }
    user.role = role;
    await user.save();
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
    await fullUser.save();
    res.json({ message: "Password updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrgStats = async (req, res) => {
  try {
    const [userCount, eventCount, roleRows] = await Promise.all([
      User.countDocuments({ organization: req.user.organization }),
      Event.countDocuments({ organization: req.user.organization }),
      User.aggregate([
        { $match: { organization: req.user.organization } },
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

module.exports = {
  listOrgUsers,
  updateUserRole,
  updateMyLocation,
  updateMyProfile,
  updateMyPassword,
  getOrgStats,
};
