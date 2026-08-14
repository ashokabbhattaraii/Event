const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const Feedback = require("../models/Feedback");
const { classifySentiment } = require("../utils/sentiment");

// Attendees can only leave feedback for an event they actually held a
// (non-cancelled) ticket for, and only once the event has happened.
const submitFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const ticket = await Ticket.findOne({
      event: event._id,
      attendee: req.user._id,
      status: { $ne: "cancelled" },
    });
    if (!ticket) {
      return res.status(403).json({ message: "You must have registered for this event to leave feedback" });
    }
    if (new Date(event.date) > new Date()) {
      return res.status(400).json({ message: "Feedback opens once the event has taken place" });
    }

    const { sentiment, sentimentScore } = classifySentiment({ rating, comment });

    const feedback = await Feedback.findOneAndUpdate(
      { event: event._id, attendee: req.user._id },
      {
        event: event._id,
        attendee: req.user._id,
        organization: event.organization,
        rating,
        comment: comment || "",
        sentiment,
        sentimentScore,
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json({ feedback });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findOne({
      event: req.params.id,
      attendee: req.user._id,
    });
    res.json({ feedback: feedback || null });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Organizer/admin: full feedback list plus an aggregated sentiment breakdown
// for the event's post-event insights panel.
const getEventFeedback = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (
      req.user.role !== "admin" &&
      event.organizer.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const [feedback, summary] = await Promise.all([
      Feedback.find({ event: event._id })
        .populate("attendee", "name")
        .sort({ createdAt: -1 }),
      Feedback.aggregate([
        { $match: { event: event._id } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            avgRating: { $avg: "$rating" },
            avgSentiment: { $avg: "$sentimentScore" },
            positive: { $sum: { $cond: [{ $eq: ["$sentiment", "positive"] }, 1, 0] } },
            neutral: { $sum: { $cond: [{ $eq: ["$sentiment", "neutral"] }, 1, 0] } },
            negative: { $sum: { $cond: [{ $eq: ["$sentiment", "negative"] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const stats = summary[0] || {
      count: 0,
      avgRating: 0,
      avgSentiment: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
    };

    res.json({
      feedback,
      summary: {
        count: stats.count,
        avgRating: Math.round((stats.avgRating || 0) * 10) / 10,
        avgSentiment: Math.round((stats.avgSentiment || 0) * 100) / 100,
        breakdown: { positive: stats.positive, neutral: stats.neutral, negative: stats.negative },
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { submitFeedback, getMyFeedback, getEventFeedback };
