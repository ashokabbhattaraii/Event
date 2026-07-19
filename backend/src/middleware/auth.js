const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }
    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token invalid" });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Not authorized for this action" });
    }
    next();
  };
};

// Permission matrix: which actions each role may perform. requireRole checks the
// role itself; requirePermission checks intent (action on a resource), which is
// more resilient to a role gaining/losing a capability without touching every route.
const ROLE_PERMISSIONS = {
  admin: [
    "org:manage",
    "user:manage",
    "security:view",
    "event:manage",
    "analytics:view",
    "ticket:verify",
  ],
  organizer: ["event:manage", "analytics:view", "ticket:verify"],
  attendee: ["event:register", "ticket:view", "feedback:submit"],
};

const requireRole = (...roles) => authorize(...roles);

const requirePermission = (permission) => {
  return (req, res, next) => {
    const allowed = ROLE_PERMISSIONS[req.user.role] || [];
    if (!allowed.includes(permission)) {
      return res
        .status(403)
        .json({ message: "Not authorized for this action" });
    }
    next();
  };
};

module.exports = { protect, authorize, requireRole, requirePermission };
