const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/ApiResponse");
const AdminSetting = require("../models/AdminSetting");

// GET /api/admin/settings (admin)
const getSettings = asyncHandler(async (req, res) => {
  const settings = await AdminSetting.getSingleton();
  sendResponse(res, 200, "Settings fetched", settings);
});

// GET /api/settings/public — safe subset any page can read (e.g. business hours, shipping threshold)
const getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await AdminSetting.getSingleton();
  sendResponse(res, 200, "Public settings fetched", {
    priorityStitchingEnabled: settings.priorityStitchingEnabled,
    freeShippingThreshold: settings.freeShippingThreshold,
    standardShippingFee: settings.standardShippingFee,
    businessHours: settings.businessHours,
    homepageCarousel: settings.homepageCarousel,
  });
});

// PATCH /api/admin/settings (admin)
const updateSettings = asyncHandler(async (req, res) => {
  const settings = await AdminSetting.getSingleton();
  Object.assign(settings, req.body);
  await settings.save();
  sendResponse(res, 200, "Settings updated", settings);
});

module.exports = { getSettings, getPublicSettings, updateSettings };
