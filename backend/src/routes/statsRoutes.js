const express = require("express");
const { getPublicStats } = require("../controllers/statsController");

const router = express.Router();

// GET /api/stats — Public aggregate statistics
router.get("/", getPublicStats);

module.exports = router;
