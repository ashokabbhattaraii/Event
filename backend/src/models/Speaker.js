const mongoose = require("mongoose");

const speakerSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Speaker name is required"],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    company: {
      type: String,
      trim: true,
      default: "",
    },
    bio: {
      type: String,
      trim: true,
      default: "",
    },
    photoUrl: {
      type: String,
      default: "",
    },
    socialLinks: {
      linkedin: { type: String, default: "" },
      twitter: { type: String, default: "" },
      website: { type: String, default: "" },
    },
    isExternal: {
      type: Boolean,
      default: true, // external speakers vs internal team members
    },
  },
  { timestamps: true }
);

speakerSchema.index({ organization: 1, name: 1 });
speakerSchema.index({ email: 1 }, { sparse: true });

module.exports = mongoose.model("Speaker", speakerSchema);