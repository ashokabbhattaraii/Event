const User = require("../models/User");
const Event = require("../models/Event");

// Admin-only, always scoped to the caller's own organization — an admin can
// never list or modify users belonging to another tenant.
const listOrgUsers = async (req, res) => {
  try {
    const users = await User.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ users });
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

module.exports = { listOrgUsers, updateUserRole, getOrgStats };
