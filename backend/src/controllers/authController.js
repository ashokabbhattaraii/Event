const mongoose = require("mongoose");
const User = require("../models/User");
const Organization = require("../models/Organization");
const generateToken = require("../utils/generateToken");
const { slugify } = require("./organizationController");

const serializeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  organization: user.organization,
});

const register = async (req, res) => {
  try {
    const { name, email, password, role, organizationId, organizationName } =
      req.body;
    const resolvedRole = role || "attendee";

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    let organization;

    if (resolvedRole === "admin") {
      // Admin sign-up creates a brand-new tenant; the admin becomes its owner.
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
    });

    if (resolvedRole === "admin") {
      organization.owner = user._id;
      await organization.save();
    }

    const token = generateToken(user._id);

    res.status(201).json({ user: serializeUser(user), token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
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

    const token = generateToken(user._id);

    res.json({ user: serializeUser(user), token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  res.json({ user: serializeUser(req.user) });
};

module.exports = { register, login, getMe };
