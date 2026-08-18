const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const User = require("../models/User");
const { validatePhoneNumber } = require("../utils/phoneValidator");

// PATCH /api/users/me
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, password, avatar } = req.body;
  const user = await User.findById(req.user._id).select("+password");
  if (!user) throw new ApiError(404, "User not found");

  if (name && name.trim()) {
    user.name = name.trim();
  }

  if (phone && phone.trim()) {
    const phoneCheck = validatePhoneNumber(phone);
    if (!phoneCheck.isValid) {
      throw new ApiError(400, phoneCheck.error || "Please provide a valid phone number");
    }
    const cleanPhone = phoneCheck.normalized;

    const existing = await User.findOne({ phone: cleanPhone, _id: { $ne: user._id } });
    if (existing) {
      throw new ApiError(409, "This phone number is already registered to another account");
    }
    user.phone = cleanPhone;
  }

  if (password) {
    if (password.length < 8) {
      throw new ApiError(400, "Password must be at least 8 characters");
    }
    user.password = password;
    user.hasPassword = true;
  }

  if (avatar) {
    user.avatar = avatar;
  }

  await user.save();
  sendResponse(res, 200, "Profile updated successfully", user.toSafeObject());
});

// --- Addresses ---

// POST /api/users/me/addresses
const addAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (req.body.isDefault) user.addresses.forEach((a) => (a.isDefault = false));
  user.addresses.push(req.body);
  await user.save();
  sendResponse(res, 201, "Address added", user.addresses);
});

// PATCH /api/users/me/addresses/:addressId
const updateAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) throw new ApiError(404, "Address not found");

  if (req.body.isDefault) user.addresses.forEach((a) => (a.isDefault = false));
  Object.assign(address, req.body);
  await user.save();
  sendResponse(res, 200, "Address updated", user.addresses);
});

// DELETE /api/users/me/addresses/:addressId
const deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.addresses.pull(req.params.addressId);
  await user.save();
  sendResponse(res, 200, "Address removed", user.addresses);
});

// --- Measurement profiles ---

// GET /api/users/me/measurements
const listMeasurementProfiles = asyncHandler(async (req, res) => {
  sendResponse(res, 200, "Measurement profiles fetched", req.user.measurementProfiles);
});

// POST /api/users/me/measurements
const createMeasurementProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (req.body.isDefault) user.measurementProfiles.forEach((p) => (p.isDefault = false));
  user.measurementProfiles.push(req.body);
  await user.save();
  sendResponse(res, 201, "Measurement profile saved", user.measurementProfiles);
});

// PATCH /api/users/me/measurements/:profileId
const updateMeasurementProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const profile = user.measurementProfiles.id(req.params.profileId);
  if (!profile) throw new ApiError(404, "Measurement profile not found");

  if (req.body.isDefault) user.measurementProfiles.forEach((p) => (p.isDefault = false));
  Object.assign(profile, req.body);
  await user.save();
  sendResponse(res, 200, "Measurement profile updated", user.measurementProfiles);
});

// DELETE /api/users/me/measurements/:profileId
const deleteMeasurementProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.measurementProfiles.pull(req.params.profileId);
  await user.save();
  sendResponse(res, 200, "Measurement profile deleted", user.measurementProfiles);
});

// POST /api/users/me/measurements/:profileId/duplicate
const duplicateMeasurementProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const profile = user.measurementProfiles.id(req.params.profileId);
  if (!profile) throw new ApiError(404, "Measurement profile not found");

  const clone = profile.toObject();
  delete clone._id;
  clone.profileName = `${clone.profileName} (Copy)`;
  clone.isDefault = false;
  user.measurementProfiles.push(clone);
  await user.save();
  sendResponse(res, 201, "Measurement profile duplicated", user.measurementProfiles);
});

// --- Admin: user management ---

// GET /api/users (admin)
const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  sendResponse(res, 200, "Users fetched", users.map((u) => u.toSafeObject()));
});

// PATCH /api/users/:id/status (admin) — activate/deactivate an account
const setUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true });
  if (!user) throw new ApiError(404, "User not found");
  sendResponse(res, 200, "User status updated", user.toSafeObject());
});

module.exports = {
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  listMeasurementProfiles,
  createMeasurementProfile,
  updateMeasurementProfile,
  deleteMeasurementProfile,
  duplicateMeasurementProfile,
  listUsers,
  setUserStatus,
};
