const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const AdminSetting = require("../models/AdminSetting");

let publicSettingsCache = null;
let publicSettingsExpiry = 0;

// GET /api/admin/settings (admin)
const getSettings = asyncHandler(async (req, res) => {
  const settings = await AdminSetting.getSingleton();
  sendResponse(res, 200, "Settings fetched", settings);
});

// GET /api/settings/public — safe subset any page can read
const getPublicSettings = asyncHandler(async (req, res) => {
  const now = Date.now();
  if (publicSettingsCache && publicSettingsExpiry > now) {
    return sendResponse(res, 200, "Public settings fetched", publicSettingsCache);
  }

  const settings = await AdminSetting.getSingleton();
  publicSettingsCache = {
    dailyTailoringCapacity: settings.dailyTailoringCapacity,
    dailyPriorityCapacity: settings.dailyPriorityCapacity,
    prioritySurchargeMin: settings.prioritySurchargeMin,
    prioritySurchargeMax: settings.prioritySurchargeMax,
    priorityStitchingEnabled: settings.priorityStitchingEnabled,
    freeShippingThreshold: settings.freeShippingThreshold,
    standardShippingFee: settings.standardShippingFee,
    businessHours: settings.businessHours,
    homepageCarousel: settings.homepageCarousel,
    homeOfferings: settings.homeOfferings,
    homeBestWork: settings.homeBestWork,
  };
  publicSettingsExpiry = now + 60000; // Cache for 60 seconds

  sendResponse(res, 200, "Public settings fetched", publicSettingsCache);
});

// PATCH /api/admin/settings (admin)
const updateSettings = asyncHandler(async (req, res) => {
  const settings = await AdminSetting.getSingleton();

  const {
    dailyTailoringCapacity,
    prioritySurchargeMin,
    prioritySurchargeMax,
    dailyPriorityCapacity,
    priorityStitchingEnabled,
    freeShippingThreshold,
    standardShippingFee,
    businessHours,
    homeOfferings,
    homeBestWork,
    homepageCarousel,
  } = req.body;

  // ── Validation: Daily Tailoring Capacity ──
  if (dailyTailoringCapacity !== undefined) {
    const capacityNum = Number(dailyTailoringCapacity);
    if (!Number.isInteger(capacityNum) || capacityNum <= 0) {
      throw new ApiError(400, "Daily tailoring capacity must be a positive integer (at least 1)");
    }
    settings.dailyTailoringCapacity = capacityNum;
  }

  // ── Validation: Priority Surcharges ──
  let nextMin = settings.prioritySurchargeMin;
  let nextMax = settings.prioritySurchargeMax;

  if (prioritySurchargeMin !== undefined) {
    const minNum = Number(prioritySurchargeMin);
    if (isNaN(minNum) || minNum < 0) {
      throw new ApiError(400, "Priority surcharge minimum must be a valid number (>= 0)");
    }
    nextMin = minNum;
  }

  if (prioritySurchargeMax !== undefined) {
    const maxNum = Number(prioritySurchargeMax);
    if (isNaN(maxNum) || maxNum < 0) {
      throw new ApiError(400, "Priority surcharge maximum must be a valid number (>= 0)");
    }
    nextMax = maxNum;
  }

  if (nextMax < nextMin) {
    throw new ApiError(
      400,
      `Priority surcharge maximum (₹${nextMax}) cannot be less than minimum (₹${nextMin})`
    );
  }

  settings.prioritySurchargeMin = nextMin;
  settings.prioritySurchargeMax = nextMax;

  if (dailyPriorityCapacity !== undefined) {
    const pCap = Number(dailyPriorityCapacity);
    if (Number.isInteger(pCap) && pCap > 0) settings.dailyPriorityCapacity = pCap;
  }

  if (priorityStitchingEnabled !== undefined) {
    settings.priorityStitchingEnabled = Boolean(priorityStitchingEnabled);
  }

  if (freeShippingThreshold !== undefined) {
    const threshold = Number(freeShippingThreshold);
    if (!isNaN(threshold) && threshold >= 0) settings.freeShippingThreshold = threshold;
  }

  if (standardShippingFee !== undefined) {
    const fee = Number(standardShippingFee);
    if (!isNaN(fee) && fee >= 0) settings.standardShippingFee = fee;
  }

  if (businessHours !== undefined) {
    settings.businessHours = String(businessHours).trim();
  }

  if (Array.isArray(homeOfferings)) {
    settings.homeOfferings = homeOfferings;
  }
  if (Array.isArray(homeBestWork)) {
    settings.homeBestWork = homeBestWork;
  }
  if (Array.isArray(homepageCarousel)) {
    settings.homepageCarousel = homepageCarousel;
  }

  await settings.save();

  // Invalidate cache immediately so new bookings read live settings
  publicSettingsCache = null;
  publicSettingsExpiry = 0;

  sendResponse(res, 200, "Business settings updated successfully", settings);
});

module.exports = { getSettings, getPublicSettings, updateSettings };
