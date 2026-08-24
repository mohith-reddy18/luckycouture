const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const { fetchPincodeDetails, validateAddressIntegrity } = require("../utils/pincodeValidator");

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

// POST /api/pincode/validate-address
router.post(
  "/validate-address",
  asyncHandler(async (req, res) => {
    const result = await validateAddressIntegrity(req.body);

    if (!result.valid) {
      throw new ApiError(400, result.error || "The entered address does not match the PIN code. Please enter the correct address/location or PIN code.");
    }

    sendResponse(res, 200, "Delivery address and physical location verified successfully", result.data);
  })
);

module.exports = router;

