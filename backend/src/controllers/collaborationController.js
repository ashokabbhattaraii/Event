const CollaborationSuggestion = require("../models/CollaborationSuggestion");
const Event = require("../models/Event");
const { scanForSuggestions } = require("../utils/collaborationEngine");
const { parsePagination, parseSort, paginate } = require("../utils/query");
const { audit } = require("../utils/audit");

const POPULATE = [
  { path: "eventA", select: "title date venue category type status capacity organization" },
  { path: "eventB", select: "title date venue category type status capacity organization" },
  { path: "orgA", select: "name city country status" },
  { path: "orgB", select: "name city country status" },
];

// Which side of a suggestion the acting user's organization is, and its
// status field — or null when the caller is neither party (must never act).
const sideFor = (suggestion, user) => {
  if (String(suggestion.orgA) === String(user.organization)) return { side: "A", field: "statusA" };
  if (String(suggestion.orgB) === String(user.organization)) return { side: "B", field: "statusB" };
  return null;
};

// Only organization admins act on behalf of their org; organizers may view
// suggestions involving their org's events but must not decide for it.
const requireOrgAdmin = (user, suggestion) => {
  if (user.role !== "admin" || !user.organization) return false;
  return sideFor(suggestion, user) !== null;
};

// Suggestion is closed once a side declined (rejected) or both accepted
// (co-hosted) — nothing more can happen on it.
const isResolved = (suggestion) => suggestion.statusA === "declined" || suggestion.statusB === "declined";
const bothAccepted = (suggestion) =>
  suggestion.statusA === "accepted" && suggestion.statusB === "accepted";

// List suggestions involving the caller's organization, newest first, with
// both events, both orgs, and each side's decision status.
const listSuggestions = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10 });
    const filter = {
      $or: [{ orgA: req.user.organization }, { orgB: req.user.organization }],
    };
    // Newest first. The frontend groups: open (needs a decision) on top,
    // resolved below.
    const sort = parseSort(req.query.sort, ["score", "createdAt"], { createdAt: -1 });

    // Confirmed matches (both accepted) sink to the bottom of the list — the
    // actionable "needs my decision" suggestions stay on top.
    const { data, pagination } = await paginate(CollaborationSuggestion, {
      filter,
      page,
      limit,
      skip,
      sort,
      populate: POPULATE,
    });

    res.json({ suggestions: data, pagination });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Manually re-run the match scan for the caller's organization (also runs
// automatically when a new event is created — see eventController).
const generateSuggestions = async (req, res) => {
  try {
    const { created, skipped } = await scanForSuggestions(req.user.organization);
    audit({
      req,
      user: req.user,
      organization: req.user.organization
        ? { _id: req.user.organization }
        : undefined,
      action: "collab_suggestions_generated",
      resourceType: "Organization",
      resourceId: req.user.organization,
      metadata: { created: created.length, skipped },
    });
    res.json({ created, skipped, message: `Found ${created.length} new collaboration matches.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Accept the suggestion for the caller's organization side. When BOTH sides
// accept, the suggestion resolves: the two events become mutual co-hosts
// (each org is added to the other event's coHostOrganizations), unlocking
// the full collaboration surface — event workspace, attendees, check-in,
// analytics, feedback — for both organizations' admins.
const acceptSuggestion = async (req, res) => {
  try {
    const suggestion = await CollaborationSuggestion.findById(req.params.id);
    if (!suggestion) {
      return res.status(404).json({ message: "Suggestion not found" });
    }
    if (!requireOrgAdmin(req.user, suggestion)) {
      return res.status(403).json({ message: "Only an admin of the involved organizations can respond" });
    }
    if (isResolved(suggestion)) {
      return res.status(400).json({ message: "This collaboration suggestion is already closed" });
    }

    const mySide = sideFor(suggestion, req.user);
    const myStatus = suggestion[mySide.field];
    if (myStatus === "accepted") {
      return res.status(400).json({ message: "You have already accepted this suggestion" });
    }
    if (myStatus === "declined") {
      return res.status(400).json({ message: "You declined this suggestion and cannot reverse it" });
    }

    suggestion[mySide.field] = "accepted";

    // Both sides in → establish the mutual co-host link on both events.
    if (bothAccepted(suggestion)) {
      const [eventA, eventB] = await Promise.all([
        Event.findById(suggestion.eventA),
        Event.findById(suggestion.eventB),
      ]);
      if (!eventA || !eventB) {
        return res.status(404).json({ message: "One of the events no longer exists" });
      }
      eventA.coHostOrganizations = eventA.coHostOrganizations || [];
      eventB.coHostOrganizations = eventB.coHostOrganizations || [];
      if (!eventA.coHostOrganizations.some((id) => String(id) === String(suggestion.orgB))) {
        eventA.coHostOrganizations.push(suggestion.orgB);
      }
      if (!eventB.coHostOrganizations.some((id) => String(id) === String(suggestion.orgA))) {
        eventB.coHostOrganizations.push(suggestion.orgA);
      }
      await Promise.all([eventA.save(), eventB.save()]);
      suggestion.resolvedAt = new Date();
      suggestion.resolvedOutcome = "co-hosted";
    }
    await suggestion.save();

    audit({
      req,
      user: req.user,
      organization: { _id: req.user.organization },
      action: "collab_suggestion_accepted",
      resourceType: "CollaborationSuggestion",
      resourceId: suggestion._id,
      metadata: { side: mySide.side, outcome: suggestion.resolvedOutcome || "pending" },
    });

    const populated = await CollaborationSuggestion.findById(suggestion._id).populate(POPULATE);
    res.json({ suggestion: populated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Decline the suggestion for the caller's side. Closes it for good — a
// declined pair is never re-suggested (the engine skips existing pairs).
const declineSuggestion = async (req, res) => {
  try {
    const suggestion = await CollaborationSuggestion.findById(req.params.id);
    if (!suggestion) {
      return res.status(404).json({ message: "Suggestion not found" });
    }
    if (!requireOrgAdmin(req.user, suggestion)) {
      return res.status(403).json({ message: "Only an admin of the involved organizations can respond" });
    }
    if (isResolved(suggestion)) {
      return res.status(400).json({ message: "This collaboration suggestion is already closed" });
    }

    const mySide = sideFor(suggestion, req.user);
    if (suggestion[mySide.field] === "declined") {
      return res.status(400).json({ message: "You already declined this suggestion" });
    }
    if (suggestion[mySide.field] === "accepted") {
      return res.status(400).json({ message: "You already accepted this suggestion — use the co-host list to remove it if needed" });
    }

    suggestion[mySide.field] = "declined";
    suggestion.resolvedAt = new Date();
    suggestion.resolvedOutcome = "rejected";
    await suggestion.save();

    audit({
      req,
      user: req.user,
      organization: { _id: req.user.organization },
      action: "collab_suggestion_declined",
      resourceType: "CollaborationSuggestion",
      resourceId: suggestion._id,
      metadata: { side: mySide.side },
    });

    const populated = await CollaborationSuggestion.findById(suggestion._id).populate(POPULATE);
    res.json({ suggestion: populated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  listSuggestions,
  generateSuggestions,
  acceptSuggestion,
  declineSuggestion,
};