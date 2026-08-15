/**
 * Database seed script.
 *
 * Wipes the collections it manages and inserts a small, self-consistent
 * demo dataset: one organization, three users (admin / organizer / attendee),
 * a few events, tickets, and notifications.
 *
 * Run with:  pnpm seed   (from the backend/ directory)
 *
 * Login credentials created by this script are printed at the end.
 */
require("dotenv").config();
const mongoose = require("mongoose");

const User = require("./models/User");
const Session = require("./models/Session");
const Mail = require("./models/Mail");
const Organization = require("./models/Organization");
const OrganizationMember = require("./models/OrganizationMember");
const Role = require("./models/Role");
const Permission = require("./models/Permission");
const Event = require("./models/Event");
const Ticket = require("./models/Ticket");
const Notification = require("./models/Notification");
const Feedback = require("./models/Feedback");
const { signTicketToken } = require("./utils/qrToken");
const { classifySentiment } = require("./utils/sentiment");

const DEMO_PASSWORD = "password123";

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error("✗ MONGODB_URI is not set. Copy .env.example to .env first.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);

  // --- Clean slate ---------------------------------------------------------
  // AuditLog is intentionally NOT wiped: the audit trail is append-only by
  // design (report §24) and should survive reseeds.
  await Promise.all([
    User.deleteMany({}),
    Organization.deleteMany({}),
    OrganizationMember.deleteMany({}),
    Role.deleteMany({}),
    Permission.deleteMany({}),
    Session.deleteMany({}),
    Mail.deleteMany({}),
    Event.deleteMany({}),
    Ticket.deleteMany({}),
    Notification.deleteMany({}),
    Feedback.deleteMany({}),
  ]);
  console.log("✓ Cleared existing collections");

  // --- Users ---------------------------------------------------------------
  // Created individually (not insertMany) so the password-hashing pre-save
  // hook on the User model runs for each document.
  const admin = await User.create({
    name: "Admin User",
    email: "admin@eventnexus.dev",
    password: DEMO_PASSWORD,
    role: "admin",
    // The seeded admin is the OVERALL system admin (no organization): they
    // approve organization registrations and control every tenant. Seeded
    // users are pre-verified so demo flows work immediately.
    emailVerifiedAt: new Date(),
  });

  const organizer = await User.create({
    name: "Olivia Organizer",
    email: "organizer@eventnexus.dev",
    password: DEMO_PASSWORD,
    role: "organizer",
    emailVerifiedAt: new Date(),
  });

  // Org admin for the demo tenant: role "admin" WITH an organization —
  // scoped to their own org (vs. the system admin above, who has none).
  const orgAdmin = await User.create({
    name: "Dev Adhikari",
    email: "orgadmin@eventnexus.dev",
    password: DEMO_PASSWORD,
    role: "admin",
    emailVerifiedAt: new Date(),
  });

  const attendee = await User.create({
    name: "Alex Attendee",
    email: "attendee@eventnexus.dev",
    password: DEMO_PASSWORD,
    role: "attendee",
    emailVerifiedAt: new Date(),
    // Seeded so distance-based recommendations work without a browser
    // (central Kathmandu). Real users' locations are captured on login.
    location: {
      lat: 27.7172,
      lng: 85.324,
      city: "Kathmandu",
      updatedAt: new Date(),
    },
  });

  // Two more attendees so the networking/matchmaking and audience
  // segmentation features have more than one person to work with.
  const attendee2 = await User.create({
    name: "Priya Sharma",
    email: "priya@eventnexus.dev",
    password: DEMO_PASSWORD,
    role: "attendee",
    emailVerifiedAt: new Date(),
    location: { lat: 27.7, lng: 85.33, city: "Kathmandu", updatedAt: new Date() },
  });
  const attendee3 = await User.create({
    name: "Sam Gurung",
    email: "sam@eventnexus.dev",
    password: DEMO_PASSWORD,
    role: "attendee",
    emailVerifiedAt: new Date(),
  });
  console.log("✓ Created users (admin, organizer, 3 attendees)");

  // --- Organization --------------------------------------------------------
  const org = await Organization.create({
    name: "EventNexus Demo Org",
    slug: "eventnexus-demo",
    owner: organizer._id,
    status: "active",
    email: "hello@eventnexus.dev",
    phone: "+977-1-5551234",
    address: "Durbar Marg",
    city: "Kathmandu",
    country: "Nepal",
    type: "Company",
    description: "Demo organization for the EventNexus platform.",
    website: "https://eventnexus.dev",
    approvedAt: new Date(),
  });

  // Link users to the organization. The system admin (admin@eventnexus.dev)
  // stays org-less — platform-level, controls all tenants (PDF).
  await User.updateMany(
    { _id: { $in: [organizer._id, orgAdmin._id, attendee._id, attendee2._id, attendee3._id] } },
    { organization: org._id }
  );
  console.log("✓ Created organization");

  // --- Roles & permissions --------------------------------------------------
  // THIS IS THE SINGLE SOURCE OF TRUTH that mirrors the RBAC matrix in
  // middleware/auth.js (ROLE_PERMISSIONS). The DB copy is authoritative at
  // runtime (loaded into roleCache by loadRoleCache); the static matrix in
  // auth.js is only a boot-time fallback before the DB cache is hydrated, so
  // the two must agree — otherwise a freshly seeded DB silently breaks the
  // requirePermission gates (e.g. feedback:submit on events.js was not in the
  // seeded attendee role, blocking all attendees from submitting feedback).
  //
  // Every code enforced by requirePermission across the routes is present here
  // and granted to the role that should hold it.
  const PERMISSIONS = [
    { code: "audit:view", name: "View audit logs", description: "Browse platform audit trail", scope: "system" },
    { code: "collaboration:invite", name: "Invite collaborators", description: "Add co-organizers and team members to an event", scope: "system" },
    { code: "event:manage", name: "Manage events", description: "Create, update, publish and delete events", scope: "system" },
    { code: "event:register", name: "Register for events", description: "Book a ticket to an event", scope: "system" },
    { code: "feedback:submit", name: "Submit event feedback", description: "Leave a rating and comment after an event", scope: "system" },
    { code: "iam:manage", name: "Manage roles & permissions", description: "Edit role permission sets (IAM matrix)", scope: "system" },
    { code: "org:approve", name: "Approve organization registrations", description: "Accept or reject new tenant signups (system admin)", scope: "system" },
    { code: "org:manage", name: "Manage organization", description: "Edit organization profile and settings", scope: "system" },
    { code: "security:view", name: "View security settings", description: "Access the admin security / IAM console", scope: "system" },
    { code: "session:manage", name: "Manage user sessions", description: "Revoke sessions, reset token versions", scope: "system" },
    { code: "ticket:verify", name: "Check in attendees", description: "Scan tickets at the door", scope: "system" },
    { code: "ticket:view", name: "View tickets", description: "See own and team ticket registrations", scope: "system" },
    { code: "user:manage", name: "Manage users", description: "Invite, edit and deactivate organization members", scope: "system" },
    { code: "analytics:view", name: "View reports & analytics", description: "Access event and org analytics dashboards", scope: "system" },
  ];

  // Permission sets mirror ROLE_PERMISSIONS in middleware/auth.js line-for-line.
  const ROLES = [
    {
      name: "admin",
      description: "Overall system administrator — controls all tenant companies (PDF \u00a72.4)",
      scope: "system",
      permissions: [
        "org:approve",
        "org:manage",
        "user:manage",
        "security:view",
        "event:manage",
        "analytics:view",
        "ticket:verify",
        "audit:view",
        "iam:manage",
        "collaboration:invite",
        "session:manage",
      ],
    },
    {
      name: "organizer",
      description: "Creates and manages events, checks in attendees",
      scope: "system",
      permissions: [
        "event:manage",
        "analytics:view",
        "ticket:verify",
        "collaboration:invite",
        "session:manage",
      ],
    },
    {
      name: "attendee",
      description: "Registers for events and manages their tickets",
      scope: "system",
      permissions: ["event:register", "ticket:view", "feedback:submit"],
    },
  ];

  await Permission.deleteMany({});
  await Permission.insertMany(PERMISSIONS);
  await Role.deleteMany({});
  await Role.insertMany(ROLES);
  console.log(`✓ Created ${PERMISSIONS.length} permissions, ${ROLES.length} roles`);

  // --- Organization members --------------------------------------------------
  await OrganizationMember.insertMany([
    { user: organizer._id, organization: org._id, roleInOrg: "owner", status: "active" },
    { user: orgAdmin._id, organization: org._id, roleInOrg: "owner", status: "active" },
    { user: attendee._id, organization: org._id, roleInOrg: "member", status: "active" },
    { user: attendee2._id, organization: org._id, roleInOrg: "member", status: "active" },
    { user: attendee3._id, organization: org._id, roleInOrg: "member", status: "active" },
  ]);
  console.log("✓ Created organization members");

  // --- Events --------------------------------------------------------------
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();

  // --- Bulk event generator (extends the dataset to 100+ events) ---------------
  // The recommendation engine, analytics and search all need realistic volume
  // to behave. The nine hand-authored events below (indices 0-8) are preserved
  // verbatim — they're referenced by the fixture tickets, feedback and
  // notifications — so this only APPENDS generated events. Dates span ~2 years
  // around now, weighted toward "Past" (the attendance-predictor model needs
  // plenty of concluded samples with registration counts).
  const GEN_CATEGORIES = [
    "Technology", "Business", "Music", "Design", "Health", "Food",
    "Sports", "Education", "Community", "Art",
  ];
  const GEN_TYPES = ["In-person", "Virtual", "Hybrid"];
  const GEN_STATUSES = ["Upcoming", "Live", "Past", "Draft"];
  const GEN_VENUES = [
    { venue: "Grand Hall, Kathmandu", lat: 27.7125, lng: 85.32, city: "Kathmandu" },
    { venue: "Rooftop Lounge, Lalitpur", lat: 27.6667, lng: 85.3167, city: "Lalitpur" },
    { venue: "Open Air Amphitheatre, Bhaktapur", lat: 27.671, lng: 85.4298, city: "Bhaktapur" },
    { venue: "Innovation Lab", lat: 27.7172, lng: 85.324, city: "Kathmandu" },
    { venue: "Yala House", lat: 27.709, lng: 85.323, city: "Kathmandu" },
    { venue: "City Center Mall", lat: 27.705, lng: 85.321, city: "Kathmandu" },
    { venue: "Green Park Pavilion", lat: 27.71, lng: 85.33, city: "Lalitpur" },
    { venue: "Virtual", lat: 27.7172, lng: 85.324, city: "Online" },
  ];
  const GEN_TITLES = [
    "Deep Dive: React Server Components", "Startup Funding 101", "Indie Music Night",
    "UX Metrics That Matter", "Morning Yoga Flow", "Food Truck Festival",
    "Local Football Cup", "AI Ethics Workshop", "Women in Tech", "Community Cleanup",
    "Photography Walk", "Data Viz with D3", "Live Jazz Quartet", "DevOps Days",
    "Plant-Based Cooking", "Chess Tournament", "Cloud Native Summit",
    "Open Source Sprint", "Design Systems Meetup", "Meditation Retreat",
    "Tech Book Club", "Angel Investing Panel", "Acoustic Sessions", "Accessibility Week",
    "Hackathon Kickoff", "Wellness Fair", "Code Review Workshop", "Film Screening",
    "Blockchain Basics", "Volunteer Fair", "Sustainable Living", "Startup Demo Day",
    "Mobile Dev Night", "Marathon Training", "Product Design Crit", "Pottery Class",
  ];
  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const randCoord = (base) => base + (Math.random() - 0.5) * 0.018;

  const generateEvents = ({ organizer, org, count }) => {
    const out = [];
    for (let i = 0; i < count; i++) {
      const v = rand(GEN_VENUES);
      const category = rand(GEN_CATEGORIES);
      // ~60% past, 30% upcoming, 7% live, 3% draft. Past events get real
      // registration counts so the attendance model has signal to learn from.
      const roll = Math.random();
      let status;
      if (roll < 0.6) status = "Past";
      else if (roll < 0.9) status = "Upcoming";
      else if (roll < 0.97) status = "Live";
      else status = "Draft";
      const offsetDays = Math.floor((Math.random() - 0.6) * 730); // ~ -440d .. +292d
      const price =
        Math.random() < 0.5
          ? { amount: 0, currency: "NPR" }
          : { amount: Math.floor(Math.random() * 2000) + 100, currency: "NPR" };
      out.push({
        title: `${rand(GEN_TITLES)} #${i + 1}`,
        description: `A ${category.toLowerCase()} event generated for the ${org.name} tenant seed dataset.`,
        date: new Date(now + offsetDays * day),
        venue: v.venue,
        coordinates: { lat: randCoord(v.lat), lng: randCoord(v.lng) },
        type: rand(GEN_TYPES),
        category,
        capacity: [50, 80, 120, 200, 300, 500][Math.floor(Math.random() * 6)],
        price,
        status,
        organizer: organizer._id,
        organization: org._id,
        registered:
          status === "Past"
            ? Math.floor(Math.random() * 180)
            : status === "Upcoming"
            ? Math.floor(Math.random() * 60)
            : 0,
      });
    }
    return out;
  };

  const additionalEvents = generateEvents({ organizer, org, count: 100 });

  const events = await Event.insertMany([
    {
      title: "Tech Conference 2026",
      description: "A full day of talks on AI, web, and cloud engineering.",
      date: new Date(now + 14 * day),
      venue: "Grand Hall, Kathmandu",
      coordinates: { lat: 27.7125, lng: 85.32 }, // ~0.6 km from attendee
      type: "In-person",
      category: "Technology",
      capacity: 300,
      price: { amount: 0, currency: "NPR" },
      status: "Upcoming",
      organizer: organizer._id,
      organization: org._id,
      registered: 1,
    },
    {
      title: "Startup Networking Night",
      description: "Meet founders, investors, and builders over drinks.",
      date: new Date(now + 3 * day),
      venue: "Rooftop Lounge, Lalitpur",
      coordinates: { lat: 27.6667, lng: 85.3167 }, // ~5.6 km from attendee
      type: "Hybrid",
      category: "Business",
      capacity: 120,
      price: { amount: 500, currency: "NPR" },
      status: "Upcoming",
      organizer: organizer._id,
      organization: org._id,
      registered: 0,
    },
    {
      title: "Live Music Festival",
      description: "An evening of live performances happening right now.",
      date: new Date(now),
      venue: "Open Air Amphitheatre, Bhaktapur",
      coordinates: { lat: 27.671, lng: 85.4298 }, // ~12 km from attendee
      type: "In-person",
      category: "Music",
      capacity: 500,
      price: { amount: 1500, currency: "NPR" },
      status: "Live",
      organizer: organizer._id,
      organization: org._id,
      registered: 2,
    },
    {
      title: "Intro to Machine Learning Workshop",
      description: "Hands-on beginner workshop. Already concluded.",
      date: new Date(now - 20 * day),
      venue: "Innovation Lab",
      type: "Virtual",
      category: "Technology",
      capacity: 80,
      price: { amount: 0, currency: "NPR" },
      status: "Past",
      organizer: organizer._id,
      organization: org._id,
      registered: 2,
    },
    // --- Historical events --------------------------------------------------
    // 5+ concluded events give the attendance-prediction model real training
    // samples (MIN_ATTENDANCE_SAMPLES is 5); without them the model stays
    // untrained and every forecast falls back to a rough heuristic.
    {
      title: "Startup Pitch Night",
      description: "Local founders pitch to investors. Concluded.",
      date: new Date(now - 35 * day),
      venue: "Yala House",
      type: "In-person",
      category: "Business",
      capacity: 60,
      price: { amount: 0, currency: "NPR" },
      status: "Past",
      organizer: organizer._id,
      organization: org._id,
      registered: 43,
    },
    {
      title: "Web Dev Bootcamp",
      description: "Two-day intensive. Concluded.",
      date: new Date(now - 55 * day),
      venue: "Innovation Lab",
      type: "In-person",
      category: "Technology",
      capacity: 40,
      price: { amount: 800, currency: "NPR" },
      status: "Past",
      organizer: organizer._id,
      organization: org._id,
      registered: 27,
    },
    {
      title: "Jazz Under the Stars",
      description: "Outdoor jazz evening. Concluded.",
      date: new Date(now - 75 * day),
      venue: "Open Air Amphitheatre, Bhaktapur",
      type: "In-person",
      category: "Music",
      capacity: 200,
      price: { amount: 700, currency: "NPR" },
      status: "Past",
      organizer: organizer._id,
      organization: org._id,
      registered: 168,
    },
    {
      title: "Design Sprint Workshop",
      description: "Hands-on design sprint. Concluded.",
      date: new Date(now - 95 * day),
      venue: "Yala House",
      type: "Virtual",
      category: "Design",
      capacity: 50,
      price: { amount: 0, currency: "NPR" },
      status: "Past",
      organizer: organizer._id,
      organization: org._id,
      registered: 11,
    },
    {
      title: "Wellness & Yoga Retreat",
      description: "Weekend retreat. Concluded.",
      date: new Date(now - 115 * day),
      venue: "Rooftop Lounge, Lalitpur",
      type: "In-person",
      category: "Health",
      capacity: 30,
      price: { amount: 900, currency: "NPR" },
      status: "Past",
      organizer: organizer._id,
      organization: org._id,
      registered: 6,
    },
    ...additionalEvents,
  ]);
  console.log(`✓ Created ${events.length} events`);

  // --- Tickets ---------------------------------------------------------------
  // A small mesh of registrations across attendees/events so networking
  // (shared-interest matching), audience segmentation, and feedback all have
  // real data to work with instead of being empty on first load.
  const makeTicket = async ({ event, user, status = "valid", payment }) => {
    const doc = new Ticket({
      event: event._id,
      attendee: user._id,
      organization: org._id,
      qrToken: "placeholder",
      status,
      payment: payment || { status: "none" },
    });
    doc.qrToken = signTicketToken(doc._id.toString(), event._id.toString(), user._id.toString());
    if (status === "checked-in") doc.checkedInAt = new Date();
    await doc.save();
    return doc;
  };

  await makeTicket({ event: events[0], user: attendee }); // Tech Conference — Alex
  await makeTicket({ event: events[0], user: attendee2 }); // Tech Conference — Priya (shared interest w/ Alex)
  await makeTicket({ event: events[3], user: attendee, status: "checked-in" }); // ML Workshop (past) — Alex
  await makeTicket({ event: events[3], user: attendee2, status: "checked-in" }); // ML Workshop (past) — Priya
  await makeTicket({ event: events[1], user: attendee3 }); // Networking Night — Sam
  // Overlapping interests give the collaborative filter real signal: Priya
  // and Sam both booked Live Music, so Alex (same taste as Priya) gets it
  // recommended instead of an empty CF result falling back to heuristics.
  await makeTicket({ event: events[2], user: attendee2 }); // Live Music — Priya
  await makeTicket({ event: events[2], user: attendee3 }); // Live Music — Sam
  console.log("✓ Created tickets");

  // --- Feedback (for the past event) ----------------------------------------
  const feedbackEntries = [
    { user: attendee, rating: 5, comment: "Fantastic workshop, the instructors were excellent and very helpful!" },
    { user: attendee2, rating: 4, comment: "Really enjoyed it, well organized. Venue was a bit crowded though." },
  ];
  for (const entry of feedbackEntries) {
    const { sentiment, sentimentScore } = classifySentiment(entry);
    await Feedback.create({
      event: events[3]._id,
      attendee: entry.user._id,
      organization: org._id,
      rating: entry.rating,
      comment: entry.comment,
      sentiment,
      sentimentScore,
    });
  }
  console.log("✓ Created feedback");

  // --- Notifications -------------------------------------------------------
  await Notification.insertMany([
    {
      recipient: attendee._id,
      organization: org._id,
      type: "registration",
      title: "Registration confirmed",
      message: `You're registered for "${events[0].title}".`,
      event: events[0]._id,
      read: false,
    },
    {
      recipient: attendee._id,
      organization: org._id,
      type: "reminder",
      title: "Event reminder",
      message: `"${events[1].title}" is happening soon.`,
      event: events[1]._id,
      read: false,
    },
    {
      recipient: organizer._id,
      organization: org._id,
      type: "system",
      title: "New registration",
      message: `${attendee.name} registered for "${events[0].title}".`,
      event: events[0]._id,
      read: false,
    },
  ]);
  console.log("✓ Created notifications");

  // --- Summary -------------------------------------------------------------
  console.log("\n─────────────────────────────────────────");
  console.log(" Seed complete. Login credentials:");
  console.log("─────────────────────────────────────────");
  console.log(` System admin admin@eventnexus.dev     / ${DEMO_PASSWORD}`);
  console.log(` Org admin    orgadmin@eventnexus.dev   / ${DEMO_PASSWORD}`);
  console.log(` Organizer    organizer@eventnexus.dev  / ${DEMO_PASSWORD}`);
  console.log(` Attendee   attendee@eventnexus.dev  / ${DEMO_PASSWORD}`);
  console.log(` Attendee   priya@eventnexus.dev     / ${DEMO_PASSWORD}`);
  console.log(` Attendee   sam@eventnexus.dev       / ${DEMO_PASSWORD}`);
  console.log("─────────────────────────────────────────\n");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(async (err) => {
  console.error("✗ Seed failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
