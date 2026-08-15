const express = require("express");
const { body, param } = require("express-validator");
const {
  createSpeaker,
  getOrganizationSpeakers,
  getSpeakerById,
  updateSpeaker,
  deleteSpeaker,
} = require("../controllers/speakerController");
const { protect, authorize, requireOrgAdmin } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

router.get("/", protect, requireOrgAdmin, getOrganizationSpeakers);
router.get("/:id", protect, requireOrgAdmin, getSpeakerById);

router.post(
  "/",
  protect,
  requireOrgAdmin,
  [body("name").notEmpty().withMessage("Speaker name is required")],
  validate,
  createSpeaker
);

router.put(
  "/:id",
  protect,
  requireOrgAdmin,
  [
    body("name").optional().notEmpty().withMessage("Name cannot be empty"),
    body("email").optional().isEmail().withMessage("Invalid email"),
  ],
  validate,
  updateSpeaker
);

router.delete("/:id", protect, requireOrgAdmin, deleteSpeaker);

module.exports = router;