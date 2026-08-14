const Event = require("../models/Event");
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
    } = req.body;

    const event = await Event.create({
      title,
      description,
      date,
      venue,
      type,
      category,
      capacity,
      price: normalizePrice(price),
      status: status || "Draft",
      coordinates,
      organizer: req.user._id,
      organization: req.user.organization,
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
];

const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const wasDraft = event.status === "Draft";

    const updates = {};
    for (const field of UPDATABLE_EVENT_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (updates.price !== undefined) {
      updates.price = normalizePrice(updates.price);
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

    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await event.deleteOne();
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

module.exports = {
  createEvent,
  getMyEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getAllEvents,
};
