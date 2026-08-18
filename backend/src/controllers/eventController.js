const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const Notification = require("../models/Notification");
const { audit } = require("../utils/audit");
const {
  parsePagination,
  buildSearch,
  buildAdvancedFilters,
  parseSort,
  paginate,
} = require("../utils/query");
const { notifyNearbyUsers } = require("../utils/proximityNotify");

const EVENT_SEARCH_FIELDS = ["title", "venue", "category", "description"];
const EVENT_SORT_FIELDS = ["date", "title", "createdAt", "registered"];

// A user may manage an event if they created it, or if they're an admin of
// the event's own organization, or if they're an admin/owner of a co-host
// organization (admins can't touch other tenants' events unless co-hosting).
const canManageEvent = (event, user) => {
  const isOwner = event.organizer?.toString() === user._id.toString();
  const isOrgAdmin =
    user.role === "admin" &&
    event.organization &&
    user.organization &&
    event.organization.toString() === user.organization.toString();
  const isCoHostAdmin =
    user.role === "admin" &&
    event.coHostOrganizations &&
    user.organization &&
    event.coHostOrganizations.some((oid) => oid.toString() === user.organization.toString());
  return isOwner || isOrgAdmin || isCoHostAdmin;
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
// Scheduling horizon: events further out than this are rejected up front —
// a 400 beats letting wildly-future dates create rem-inder jobs and
// bookings that lose meaning over time.
const MAX_FUTURE_EVENT_MS = 2 * 365 * 24 * 60 * 60 * 1000; // ~2 years

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
      reminderSettings,
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
    if (eventDate.getTime() - Date.now() > MAX_FUTURE_EVENT_MS) {
      return res.status(400).json({ message: "Event date can't be more than 2 years in the future" });
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
      reminderSettings,
      organizer: req.user._id,
      organization: req.user.organization,
      price: normalizedPrice,
    });
    if (event.status !== "Draft") {
      notifyNearbyUsers(event).catch((err) =>
        console.error("[proximity-notify] failed:", err.message)
      );
    }

    // Fire-and-forget: a new published event is immediately matched against
    // other organizations' events, so collaboration suggestions appear on
    // the Collaboration page without waiting for a manual scan. Best-effort
    // — the scan never blocks event creation.
    {
      const { scanForSuggestions } = require("../utils/collaborationEngine");
      scanForSuggestions(event.organization).catch((err) =>
        console.error("[collab-suggest] scan failed:", err.message)
      );
    }

    audit({
      req,
      action: "event_created",
      resourceType: "Event",
      resourceId: event._id,
      metadata: { title: event.title, status: event.status },
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
      // type supports multi-select (?type=In-person&type=Virtual) via $in
      ...buildAdvancedFilters(req.query, ["status", "type", "category"], { arrayFields: ["type"] }),
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
  "reminderSettings",
  "coHostOrganizations",
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
      if (d.getTime() - Date.now() > MAX_FUTURE_EVENT_MS) {
        return res.status(400).json({ message: "Event date can't be more than 2 years in the future" });
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

    audit({
      req,
      action: "event_updated",
      resourceType: "Event",
      resourceId: event._id,
      metadata: { title: event.title, fields: Object.keys(updates) },
    });

    res.json({ event });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Returns true only for the event owner / owning organization's admins.
// Co-host organization admins may manage an event (canManageEvent) but must
// never delete it — deletion is an ownership action (matches the documented
// co-host policy: "except ownership").
const isOwningOrgManager = (event, user) => {
  const isOwner = event.organizer?.toString() === user._id.toString();
  const isOrgAdmin =
    user.role === "admin" &&
    event.organization &&
    user.organization &&
    event.organization.toString() === user.organization.toString();
  return isOwner || isOrgAdmin;
};

const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (!isOwningOrgManager(event, req.user)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Cascade: tickets and notifications for the event are orphans otherwise —
    // attendees would still see "tickets" for an event that no longer exists.
    await Promise.all([
      Ticket.deleteMany({ event: event._id }),
      Notification.deleteMany({ event: event._id }),
      event.deleteOne(),
    ]);

    audit({
      req,
      action: "event_deleted",
      resourceType: "Event",
      resourceId: event._id,
      metadata: { title: event.title },
    });

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
      // type supports multi-select (?type=In-person&type=Virtual) via $in
      ...buildAdvancedFilters(req.query, ["category", "type"], { arrayFields: ["type"] }),
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
//
// Exception: events where the admin's organization is a co-host. Their org
// is a managing party (canManageEvent), so they must be listed — otherwise
// co-host org admins have no way to reach those events, even though the
// backend grants them management access (check-in, analytics, feedback).
const getOrgEvents = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 9 });

    let scope = { organization: req.user.organization };
    if (req.user.organization) {
      const coHosted = await Event.find({ coHostOrganizations: req.user.organization })
        .select("_id")
        .lean();
      if (coHosted.length > 0) {
        scope = {
          $or: [
            { organization: req.user.organization },
            { _id: { $in: coHosted.map((e) => e._id) } },
          ],
        };
      }
    }

    const filter = {
      ...scope,
      ...buildSearch(req.query.search, EVENT_SEARCH_FIELDS),
      // type supports multi-select (?type=In-person&type=Virtual) via $in
      ...buildAdvancedFilters(req.query, ["status", "type", "category"], { arrayFields: ["type"] }),
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

// List co-host organizations for an event.
const listCoHostOrganizations = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("coHostOrganizations", "name email phone city country status")
      .lean();
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (!canManageEvent(event, req.user)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    res.json({ coHostOrganizations: event.coHostOrganizations || [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add a co-host organization to an event.
const addCoHostOrganization = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (!canManageEvent(event, req.user)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const { organizationId } = req.body;
    if (event.organization.toString() === organizationId) {
      return res.status(400).json({ message: "Owning organization cannot be a co-host" });
    }
    if (event.coHostOrganizations?.some((oid) => oid.toString() === organizationId)) {
      return res.status(400).json({ message: "Organization is already a co-host" });
    }
    event.coHostOrganizations = event.coHostOrganizations || [];
    event.coHostOrganizations.push(organizationId);
    await event.save();
    await event.populate("coHostOrganizations", "name email phone city country status");
    res.json({ coHostOrganizations: event.coHostOrganizations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remove a co-host organization from an event.
const removeCoHostOrganization = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (!canManageEvent(event, req.user)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const { orgId } = req.params;
    if (!event.coHostOrganizations?.some((oid) => oid.toString() === orgId)) {
      return res.status(404).json({ message: "Co-host organization not found" });
    }
    event.coHostOrganizations = event.coHostOrganizations.filter((oid) => oid.toString() !== orgId);
    await event.save();
    await event.populate("coHostOrganizations", "name email phone city country status");
    res.json({ coHostOrganizations: event.coHostOrganizations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Real AI-powered insight for the organizer's event workspace. Asks the LLM
// provider (Gemini → Groq, see utils/aiProvider) for a concise demand
// analysis of the event, with a deterministic fallback whenever the provider
// is unreachable or unset, and attaches the attendance forecast (AI
// regressor with a velocity heuristic fallback — utils/predictAttendance).
const getEventAiInsight = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (!canManageEvent(event, req.user)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { generateEventInsight } = require("../utils/aiProvider");
    const predictAttendance = require("../utils/predictAttendance");

    const daysUntil = Math.max(0, Math.ceil((new Date(event.date) - Date.now()) / (1000 * 60 * 60 * 24)));
    const fillRate = event.capacity > 0 ? Math.round((event.registered / event.capacity) * 100) : 0;

    const insightEvent = {
      title: event.title,
      category: event.category,
      type: event.type,
      capacity: event.capacity,
      registered: event.registered,
      status: event.status,
      daysUntil,
    };

    // Cap the LLM round-trip so a slow provider never hangs the workspace
    // — past 8s we take the heuristic instead.
    let insight = await Promise.race([
      generateEventInsight(insightEvent),
      new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
    ]);
    let source = "ai";
    if (!insight) {
      source = "heuristic";
      if (event.registered === 0) {
        insight = `"${event.title}" has no registrations yet. Early promotion builds the momentum that drives visibility and demand.`;
      } else if (daysUntil === 0) {
        insight = `"${event.title}" is happening today with ${event.registered}/${event.capacity} registered (${fillRate}% of capacity). Focus on last-minute check-in reminders and a smooth entry flow.`;
      } else if (fillRate >= 80) {
        insight = `"${event.title}" is nearly full at ${fillRate}% capacity. Consider expanding capacity or closing registrations soon to preserve scarcity.`;
      } else if (fillRate >= 40) {
        insight = `"${event.title}" is filling steadily at ${fillRate}% with ${daysUntil} day${daysUntil === 1 ? "" : "s"} to go. A targeted reminder campaign could convert more of the remaining ${event.capacity - event.registered} spots.`;
      } else {
        insight = `"${event.title}" has ${event.capacity - event.registered} spots remaining (${fillRate}% full) with ${daysUntil} day${daysUntil === 1 ? "" : "s"} to go — a wide-open funnel, so promotion should be the priority.`;
      }
    }

    const forecast = await predictAttendance(event);

    res.json({
      eventId: event._id,
      insight,
      source,
      forecast: {
        predicted: forecast,
        registered: event.registered,
        capacity: event.capacity,
      },
    });
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
  getEventAiInsight,
  addCoHostOrganization,
  removeCoHostOrganization,
  listCoHostOrganizations,
  canManageEvent,
};
