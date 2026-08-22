const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const { fetchPincodeDetails } = require("../utils/pincodeValidator");

const router = express.Router();

// GET /api/pincode/:pincode
router.get(
  "/:pincode",
  asyncHandler(async (req, res) => {
    const { pincode } = req.params;
    const result = await fetchPincodeDetails(pincode);

    if (!result.valid) {
      const statusCode = result.isServiceUnavailable ? 503 : 400;
      throw new ApiError(statusCode, result.error || "Invalid Indian PIN code");
    }

    sendResponse(res, 200, "Indian postal PIN details verified", result);
  })
);

module.exports = router;
