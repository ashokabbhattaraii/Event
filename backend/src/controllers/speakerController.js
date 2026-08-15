const Speaker = require("../models/Speaker");
const { canManageEvent } = require("./eventController");
const Event = require("../models/Event");

const createSpeaker = async (req, res) => {
  try {
    const { name, email, title, company, bio, photoUrl, socialLinks, isExternal } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Speaker name is required" });
    }

    // Determine organization from user (org admin) or event
    let organization = req.user.organization;
    if (!organization && req.body.eventId) {
      const event = await Event.findById(req.body.eventId);
      if (event) organization = event.organization;
    }
    if (!organization) {
      return res.status(400).json({ message: "Organization context required" });
    }

    const speaker = await Speaker.create({
      organization,
      name: name.trim(),
      email: email?.trim().toLowerCase() || "",
      title: title?.trim() || "",
      company: company?.trim() || "",
      bio: bio?.trim() || "",
      photoUrl: photoUrl || "",
      socialLinks: socialLinks || {},
      isExternal: isExternal !== false,
    });

    res.status(201).json({ speaker });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrganizationSpeakers = async (req, res) => {
  try {
    const organization = req.user.organization;
    if (!organization) {
      return res.status(400).json({ message: "No organization context" });
    }
    const speakers = await Speaker.find({ organization })
      .sort({ name: 1 })
      .lean();
    res.json({ speakers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSpeakerById = async (req, res) => {
  try {
    const speaker = await Speaker.findById(req.params.id).lean();
    if (!speaker) {
      return res.status(404).json({ message: "Speaker not found" });
    }
    if (speaker.organization.toString() !== req.user.organization?.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    res.json({ speaker });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSpeaker = async (req, res) => {
  try {
    const speaker = await Speaker.findById(req.params.id);
    if (!speaker) {
      return res.status(404).json({ message: "Speaker not found" });
    }
    if (speaker.organization.toString() !== req.user.organization?.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { name, email, title, company, bio, photoUrl, socialLinks, isExternal } = req.body;
    if (name !== undefined) speaker.name = name.trim();
    if (email !== undefined) speaker.email = email?.trim().toLowerCase() || "";
    if (title !== undefined) speaker.title = title?.trim() || "";
    if (company !== undefined) speaker.company = company?.trim() || "";
    if (bio !== undefined) speaker.bio = bio?.trim() || "";
    if (photoUrl !== undefined) speaker.photoUrl = photoUrl || "";
    if (socialLinks !== undefined) speaker.socialLinks = socialLinks || {};
    if (isExternal !== undefined) speaker.isExternal = isExternal;

    await speaker.save();
    res.json({ speaker });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteSpeaker = async (req, res) => {
  try {
    const speaker = await Speaker.findById(req.params.id);
    if (!speaker) {
      return res.status(404).json({ message: "Speaker not found" });
    }
    if (speaker.organization.toString() !== req.user.organization?.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await speaker.deleteOne();
    res.json({ message: "Speaker deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createSpeaker,
  getOrganizationSpeakers,
  getSpeakerById,
  updateSpeaker,
  deleteSpeaker,
};