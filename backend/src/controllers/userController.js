const User = require("../models/User");
const Event = require("../models/Event");
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
const updateMyLocation = async (req, res) => {
  try {
    const { lat, lng, city } = req.body;
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

const getOrgStats = async (req, res) => {
  try {
    const [userCount, eventCount] = await Promise.all([
      User.countDocuments({ organization: req.user.organization }),
      Event.countDocuments({ organization: req.user.organization }),
    ]);
    res.json({ userCount, eventCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { listOrgUsers, updateUserRole, updateMyLocation, getOrgStats };
