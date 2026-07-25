const Event = require("../models/Event");
const {
  parsePagination,
  buildSearch,
  buildFilters,
  parseSort,
  paginate,
} = require("../utils/query");

const EVENT_SEARCH_FIELDS = ["title", "venue", "category", "description"];
const EVENT_SORT_FIELDS = ["date", "title", "createdAt", "registered"];

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
      price,
      status: status || "Draft",
      coordinates,
      organizer: req.user._id,
      organization: req.user.organization,
    });

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

const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("organizer", "name email")
      .populate("organization", "name");
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.json({ event });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const updated = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({ event: updated });
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
