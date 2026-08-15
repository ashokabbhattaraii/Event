const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const Notification = require("../models/Notification");
const {
  parsePagination,
  buildSearch,
  buildFilters,
  parseSort,
  paginate,
} = require("../utils/query");
const { notifyNearbyUsers } = require("../utils/proximityNotify");

const EVENT_SEARCH_FIELDS = ["title", "venue", "category", "description"];
const EVENT_SORT_FIELDS = ["date", "title", "createdAt", "registered"];

// A user may manage an event if they created it, or if they're an admin of
// the event's own organization (admins can't touch other tenants' events).
const canManageEvent = (event, user) => {
  const isOwner = event.organizer?.toString() === user._id.toString();
  const isOrgAdmin =
    user.role === "admin" &&
    event.organization &&
    user.organization &&
    event.organization.toString() === user.organization.toString();
  return isOwner || isOrgAdmin;
};

// Accepts either a plain number (ticket amount) or an { amount, currency }
// object from the client and normalizes it to the model's shape.
const normalizePrice = (price) => {
  if (price == null || price === "") return { amount: 0, currency: "NPR" };
  if (typeof price === "object") {
    return {
      amount: Number(price.amount) || 0,
      currency: (price.currency || "NPR").toUpperCase(),
    };
  }
  return { amount: Number(price) || 0, currency: "NPR" };
};

const EVENT_STATUSES = ["Draft", "Upcoming", "Live", "Past"];

const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      venue,
      type,
      category,
      capacity,
      price,
      status,
      coordinates,
      imageUrl,
      tags,
      highlights,
      agenda,
      speakers,
      requirements,
      refundPolicy,
      contactEmail,
      contactPhone,
      website,
    } = req.body;

    // Route-level express-validator covers presence; these guards turn the
    // model's raw validation errors (which used to surface as 500s) into
    // clear 400s and keep status/date/capacity internally consistent.
    if (status && !EVENT_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Invalid status — must be one of: ${EVENT_STATUSES.join(", ")}` });
    }
    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
      return res.status(400).json({ message: "Invalid event date" });
    }
    if (eventDate <= new Date()) {
      return res.status(400).json({ message: "Event date must be in the future" });
    }
    const cap = Number(capacity);
    if (!Number.isInteger(cap) || cap < 1) {
      return res.status(400).json({ message: "Capacity must be a positive integer" });
    }

    const normalizedPrice = normalizePrice(price);
    if (normalizedPrice.amount < 0) {
      return res.status(400).json({ message: "Price can't be negative" });
    }

    const event = await Event.create({
      title,
      description,
      date: eventDate,
      venue,
      type,
      category,
      capacity: cap,
      status: status || "Draft",
      coordinates,
      imageUrl,
      tags,
      highlights,
      agenda,
      speakers,
      requirements,
      refundPolicy,
      contactEmail,
      contactPhone,
      website,
      organizer: req.user._id,
      organization: req.user.organization,
      price: normalizedPrice,
    });
    if (event.status !== "Draft") {
      notifyNearbyUsers(event).catch((err) =>
        console.error("[proximity-notify] failed:", err.message)
      );
    }

    res.status(201).json({ event });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyEvents = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 9 });
    const filter = {
      organizer: req.user._id,
      ...buildSearch(req.query.search, EVENT_SEARCH_FIELDS),
      ...buildFilters(req.query, ["status", "type", "category"]),
    };
    const sort = parseSort(req.query.sort, EVENT_SORT_FIELDS, { createdAt: -1 });

    const { data, pagination } = await paginate(Event, {
      filter,
      page,
      limit,
      skip,
      sort,
    });
    res.json({ events: data, pagination });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Draft events are only visible to members of the owning organization
// (any authenticated role). Everything else (Upcoming/Live/Past) is public.
// req.user is optional here (see routes/events.js: optionalAuth), so
// anonymous callers only ever see non-draft events.
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("organizer", "name email")
      .populate("organization", "name");
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.status === "Draft") {
      const sameOrg =
        req.user?.organization &&
        event.organization?._id.toString() === req.user.organization.toString();
      if (!sameOrg) {
        return res.status(404).json({ message: "Event not found" });
      }
    }

    res.json({ event });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Only these fields may be changed by an update — anything else in req.body
// (organization, organizer, registered, etc.) is silently ignored rather
// than blindly passed to findByIdAndUpdate.
const UPDATABLE_EVENT_FIELDS = [
  "title",
  "description",
  "date",
  "venue",
  "coordinates",
  "type",
  "category",
  "capacity",
  "price",
  "status",
  "imageUrl",
  "tags",
  "highlights",
  "agenda",
  "speakers",
  "requirements",
  "refundPolicy",
  "contactEmail",
  "contactPhone",
  "website",
];

const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (!canManageEvent(event, req.user)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const wasDraft = event.status === "Draft";

    const updates = {};
    for (const field of UPDATABLE_EVENT_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (updates.status !== undefined && !EVENT_STATUSES.includes(updates.status)) {
      return res.status(400).json({ message: `Invalid status — must be one of: ${EVENT_STATUSES.join(", ")}` });
    }
    if (updates.price !== undefined) {
      updates.price = normalizePrice(updates.price);
      if (updates.price.amount < 0) {
        return res.status(400).json({ message: "Price can't be negative" });
      }
    }
    if (updates.capacity !== undefined) {
      const cap = Number(updates.capacity);
      if (!Number.isInteger(cap) || cap < 1) {
        return res.status(400).json({ message: "Capacity must be a positive integer" });
      }
      if (cap < event.registered) {
        return res
          .status(400)
          .json({ message: "Capacity can't be lower than current registrations" });
      }
      updates.capacity = cap;
    }
    if (updates.date !== undefined) {
      const d = new Date(updates.date);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ message: "Invalid event date" });
      }
      updates.date = d;
    }
    // Status/date consistency: an event dated in the past can't flip to
    // "Upcoming"/"Live" (it would show as upcoming while long over), and a
    // future event can't be re-dated into the past unless it's marked
    // Past/Draft. Previously a status change alone could resurrect a
    // past-dated event as "Upcoming".
    const statusAfter = updates.status || event.status;
    const dateAfter = updates.date || event.date;
    if (statusAfter !== "Past" && statusAfter !== "Draft" && dateAfter <= new Date()) {
      return res
        .status(400)
        .json({ message: "An event with a date in the past can't be Upcoming/Live" });
    }

    // .set + .save (not findByIdAndUpdate) so the pre-save hook that mirrors
    // coordinates into a GeoJSON point (for proximity queries) actually runs.
    event.set(updates);
    await event.save();

    if (wasDraft && event.status !== "Draft") {
      notifyNearbyUsers(event).catch((err) =>
        console.error("[proximity-notify] failed:", err.message)
      );
    }

    res.json({ event });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (!canManageEvent(event, req.user)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Cascade: tickets and notifications for the event are orphans otherwise —
    // attendees would still see "tickets" for an event that no longer exists.
    await Promise.all([
      Ticket.deleteMany({ event: event._id }),
      Notification.deleteMany({ event: event._id }),
      event.deleteOne(),
    ]);
    res.json({ message: "Event deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllEvents = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 9 });

    const filter = {
      ...buildSearch(req.query.search, EVENT_SEARCH_FIELDS),
      ...buildFilters(req.query, ["category", "type"]),
    };
    // Public browse never exposes drafts. An explicit status filter is honored
    // for any non-draft value; otherwise all non-draft events are returned.
    const { status } = req.query;
    filter.status =
      status && status !== "all" && status !== "Draft"
        ? status
        : { $ne: "Draft" };

    const sort = parseSort(req.query.sort, EVENT_SORT_FIELDS, { date: 1 });

    const { data, pagination } = await paginate(Event, {
      filter,
      page,
      limit,
      skip,
      sort,
      populate: [
        { path: "organizer", select: "name" },
        { path: "organization", select: "name" },
      ],
    });
    res.json({ events: data, pagination });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin's own-tenant event listing. The public getAllEvents is intentionally
// org-agnostic (attendees browse everything), but admin "oversight" must be
// scoped like the rest of the admin surface (users, stats, orgs), otherwise
// an admin sees — and is expected to verify — events from other tenants,
// which verifyTicket explicitly forbids.
const getOrgEvents = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 9 });

    const filter = {
      organization: req.user.organization,
      ...buildSearch(req.query.search, EVENT_SEARCH_FIELDS),
      ...buildFilters(req.query, ["status", "type", "category"]),
    };
    const { status } = req.query;
    filter.status =
      status && status !== "all" && status !== "Draft"
        ? status
        : { $ne: "Draft" };

    const sort = parseSort(req.query.sort, EVENT_SORT_FIELDS, { createdAt: -1 });

    const { data, pagination } = await paginate(Event, {
      filter,
      page,
      limit,
      skip,
      sort,
      populate: [
        { path: "organizer", select: "name" },
        { path: "organization", select: "name" },
      ],
    });
    res.json({ events: data, pagination });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createEvent,
  getMyEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getAllEvents,
  getOrgEvents,
  canManageEvent,
};
