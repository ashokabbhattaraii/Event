const mongoose = require("mongoose");

// An AI-generated collaboration suggestion between two organizations' events
// (see utils/collaborationEngine.js for how matches are found and scored).
//
// Lifecycle: the engine creates a suggestion per event pair (unique index
// below). Each organization's admin decides on THEIR side (statusA/statusB).
// When both accept, the suggestion "resolves" and the two events become
// mutual co-hosts (each org is added to the other event's
// coHostOrganizations) — from then on the normal collaboration surface
// (event hub, attendees, check-in, analytics) handles the rest.
// If either side declines, the suggestion is resolved as rejected and never
// resurfaces for that pair.
const collaborationSuggestionSchema = new mongoose.Schema(
  {
    eventA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    eventB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    // The two organizations behind those events — denormalized so every
    // "whose suggestion is this?" lookup is a plain field match, and so the
    // decision endpoint can authorize the acting admin by comparing against
    // req.user.organization without loading the events.
    orgA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    orgB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    // Overall compatibility 0-100. Suggestions below the engine's threshold
    // are never created; scores let the UI rank the list.
    score: { type: Number, required: true, min: 0, max: 100 },
    // Where that score came from: "ml" = the AI service's collaboration-
    // match model blended with the heuristic; "heuristic" = the engine's
    // deterministic scorer alone (AI service/model unavailable).
    scoreSource: { type: String, enum: ["ml", "heuristic"], default: "heuristic" },
    // Why the engine thinks these two events fit: one entry per matched
    // dimension with a human-readable detail ("Same category: Technology").
    matchedFactors: [
      {
        factor: { type: String, required: true },
        detail: { type: String, default: "" },
        weight: { type: Number, default: 0 },
      },
    ],
    // 2-3 sentence rationale ("co-hosting would merge your audiences…").
    // Written by the LLM when the AI service is up; otherwise a template
    // built from the matched factors. rationaleSource tells the UI which.
    rationale: { type: String, default: "" },
    rationaleSource: { type: String, enum: ["ai", "heuristic"], default: "heuristic" },
    // Decision of the ORG-A side's admin and the ORG-B side's admin.
    statusA: { type: String, enum: ["suggested", "accepted", "declined"], default: "suggested" },
    statusB: { type: String, enum: ["suggested", "accepted", "declined"], default: "suggested" },
    // Set when the suggestion is closed: both accepted → "co-hosted"
    // (events became mutual co-hosts); anyone declined → "rejected".
    resolvedAt: Date,
    resolvedOutcome: { type: String, enum: ["co-hosted", "rejected"] },
  },
  { timestamps: true }
);

// One suggestion per event pair — the engine upserts on this.
collaborationSuggestionSchema.index({ eventA: 1, eventB: 1 }, { unique: true });
// Lookup path: "suggestions touching my org", newest first.
collaborationSuggestionSchema.index({ orgA: 1, createdAt: -1 });
collaborationSuggestionSchema.index({ orgB: 1, createdAt: -1 });

module.exports = mongoose.model("CollaborationSuggestion", collaborationSuggestionSchema);