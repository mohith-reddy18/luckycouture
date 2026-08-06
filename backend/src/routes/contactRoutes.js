const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { contactMessageRules } = require("../validators/contactValidators");
const {
  createContactMessage,
  listContactMessages,
  updateContactMessage,
  deleteContactMessage,
} = require("../controllers/contactController");

const router = express.Router();

router.post("/", contactMessageRules, validate, createContactMessage);
router.get("/", protect, authorize("admin"), listContactMessages);
router.patch("/:id", protect, authorize("admin"), updateContactMessage);
router.delete("/:id", protect, authorize("admin"), deleteContactMessage);

module.exports = router;
