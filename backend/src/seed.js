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
const Organization = require("./models/Organization");
const Event = require("./models/Event");
const Ticket = require("./models/Ticket");
const Notification = require("./models/Notification");
const { signTicketToken } = require("./utils/qrToken");

const DEMO_PASSWORD = "password123";

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error("✗ MONGODB_URI is not set. Copy .env.example to .env first.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);

  // --- Clean slate ---------------------------------------------------------
  await Promise.all([
    User.deleteMany({}),
    Organization.deleteMany({}),
    Event.deleteMany({}),
    Ticket.deleteMany({}),
    Notification.deleteMany({}),
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
  });

  const organizer = await User.create({
    name: "Olivia Organizer",
    email: "organizer@eventnexus.dev",
    password: DEMO_PASSWORD,
    role: "organizer",
  });

  const attendee = await User.create({
    name: "Alex Attendee",
    email: "attendee@eventnexus.dev",
    password: DEMO_PASSWORD,
    role: "attendee",
  });
  console.log("✓ Created users (admin, organizer, attendee)");

  // --- Organization --------------------------------------------------------
  const org = await Organization.create({
    name: "EventNexus Demo Org",
    slug: "eventnexus-demo",
    owner: organizer._id,
    status: "active",
  });

  // Link users to the organization.
  await User.updateMany(
    { _id: { $in: [admin._id, organizer._id, attendee._id] } },
    { organization: org._id }
  );
  console.log("✓ Created organization");

  // --- Events --------------------------------------------------------------
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const events = await Event.insertMany([
    {
      title: "Tech Conference 2026",
      description: "A full day of talks on AI, web, and cloud engineering.",
      date: new Date(now + 14 * day),
      venue: "Grand Hall, Kathmandu",
      type: "In-person",
      category: "Technology",
      capacity: 300,
      price: "Free",
      status: "Upcoming",
      organizer: organizer._id,
      organization: org._id,
      registered: 1,
    },
    {
      title: "Startup Networking Night",
      description: "Meet founders, investors, and builders over drinks.",
      date: new Date(now + 3 * day),
      venue: "Rooftop Lounge",
      type: "Hybrid",
      category: "Business",
      capacity: 120,
      price: "Rs. 500",
      status: "Upcoming",
      organizer: organizer._id,
      organization: org._id,
      registered: 0,
    },
    {
      title: "Live Music Festival",
      description: "An evening of live performances happening right now.",
      date: new Date(now),
      venue: "Open Air Amphitheatre",
      type: "In-person",
      category: "Music",
      capacity: 500,
      price: "Rs. 1500",
      status: "Live",
      organizer: organizer._id,
      organization: org._id,
      registered: 0,
    },
    {
      title: "Intro to Machine Learning Workshop",
      description: "Hands-on beginner workshop. Already concluded.",
      date: new Date(now - 20 * day),
      venue: "Innovation Lab",
      type: "Virtual",
      category: "Education",
      capacity: 80,
      price: "Free",
      status: "Past",
      organizer: organizer._id,
      organization: org._id,
      registered: 0,
    },
  ]);
  console.log(`✓ Created ${events.length} events`);

  // --- Ticket (attendee registered for the Tech Conference) ----------------
  const ticketDoc = new Ticket({
    event: events[0]._id,
    attendee: attendee._id,
    organization: org._id,
    qrToken: "placeholder", // replaced below once we have the ticket _id
    status: "valid",
  });
  ticketDoc.qrToken = signTicketToken(
    ticketDoc._id.toString(),
    events[0]._id.toString(),
    attendee._id.toString()
  );
  await ticketDoc.save();
  console.log("✓ Created ticket for attendee");

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
  console.log(` Admin      admin@eventnexus.dev     / ${DEMO_PASSWORD}`);
  console.log(` Organizer  organizer@eventnexus.dev / ${DEMO_PASSWORD}`);
  console.log(` Attendee   attendee@eventnexus.dev  / ${DEMO_PASSWORD}`);
  console.log("─────────────────────────────────────────\n");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(async (err) => {
  console.error("✗ Seed failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
