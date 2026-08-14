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
  await Promise.all([
    User.deleteMany({}),
    Organization.deleteMany({}),
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
    location: { lat: 27.7, lng: 85.33, city: "Kathmandu", updatedAt: new Date() },
  });
  const attendee3 = await User.create({
    name: "Sam Gurung",
    email: "sam@eventnexus.dev",
    password: DEMO_PASSWORD,
    role: "attendee",
  });
  console.log("✓ Created users (admin, organizer, 3 attendees)");

  // --- Organization --------------------------------------------------------
  const org = await Organization.create({
    name: "EventNexus Demo Org",
    slug: "eventnexus-demo",
    owner: organizer._id,
    status: "active",
  });

  // Link users to the organization.
  await User.updateMany(
    { _id: { $in: [admin._id, organizer._id, attendee._id, attendee2._id, attendee3._id] } },
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
      registered: 0,
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
  console.log(` Admin      admin@eventnexus.dev     / ${DEMO_PASSWORD}`);
  console.log(` Organizer  organizer@eventnexus.dev / ${DEMO_PASSWORD}`);
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
