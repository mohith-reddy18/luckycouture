const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/ApiResponse");
const AdminSetting = require("../models/AdminSetting");

let publicSettingsCache = null;
let publicSettingsExpiry = 0;

// GET /api/admin/settings (admin)
const getSettings = asyncHandler(async (req, res) => {
  const settings = await AdminSetting.getSingleton();
  sendResponse(res, 200, "Settings fetched", settings);
});

// GET /api/settings/public — safe subset any page can read (e.g. business hours, shipping threshold)
const getPublicSettings = asyncHandler(async (req, res) => {
  const now = Date.now();
  if (publicSettingsCache && publicSettingsExpiry > now) {
    return sendResponse(res, 200, "Public settings fetched", publicSettingsCache);
  }

  const settings = await AdminSetting.getSingleton();
  publicSettingsCache = {
    priorityStitchingEnabled: settings.priorityStitchingEnabled,
    freeShippingThreshold: settings.freeShippingThreshold,
    standardShippingFee: settings.standardShippingFee,
    businessHours: settings.businessHours,
    homepageCarousel: settings.homepageCarousel,
  };
  publicSettingsExpiry = now + 60000; // Cache for 60 seconds

  sendResponse(res, 200, "Public settings fetched", publicSettingsCache);
});

// PATCH /api/admin/settings (admin)
const updateSettings = asyncHandler(async (req, res) => {
  const settings = await AdminSetting.getSingleton();
  Object.assign(settings, req.body);
  await settings.save();
  publicSettingsCache = null;
  publicSettingsExpiry = 0;
  sendResponse(res, 200, "Settings updated", settings);
});

module.exports = { getSettings, getPublicSettings, updateSettings };
