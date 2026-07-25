const mongoose = require("mongoose");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const Organization = require("../models/Organization");
const generateToken = require("../utils/generateToken");
const { slugify } = require("./organizationController");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
      // Promote allowlisted emails to admin.
      if (admin && user.role !== "admin") {
        user.role = "admin";
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
      });
      if (admin) await assignDefaultOrg(user);
      await user.save();
    }

    const token = generateToken(user._id);
    res.json({ user: serializeUser(user), token });
  } catch (error) {
    res.status(401).json({ message: "Google authentication failed" });
  }
};

const getMe = async (req, res) => {
  res.json({ user: serializeUser(req.user) });
};

module.exports = { register, login, googleLogin, getMe };
