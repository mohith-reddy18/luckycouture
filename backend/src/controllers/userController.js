const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const User = require("../models/User");
const { validatePhoneNumber } = require("../utils/phoneValidator");
const { validateAddressIntegrity } = require("../utils/pincodeValidator");

// PATCH /api/users/me
const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, phone, password, avatar } = req.body;
  const user = await User.findById(req.user._id).select("+password");
  if (!user) throw new ApiError(404, "User not found");

  const isGoogleUser = Boolean(user.googleId || user.authProvider === "google");
  const isPhoneUser = !isGoogleUser && (user.authProvider === "phone" || (user.phone && !user.email));

  // 1. Name: can be edited by all users
  if (name !== undefined) {
    if (!name.trim()) {
      throw new ApiError(400, "Full name cannot be empty");
    }
    user.name = name.trim();
  }

  // 2. Email handling
  if (email !== undefined) {
    const cleanEmail = email ? email.trim().toLowerCase() : "";
    if (isGoogleUser) {
      // Google users: Email is read-only and cannot be changed
      if (cleanEmail && cleanEmail !== (user.email || "").toLowerCase()) {
        throw new ApiError(400, "Email address cannot be changed for Google login accounts");
      }
    } else if (cleanEmail && cleanEmail !== (user.email || "").toLowerCase()) {
      if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
        throw new ApiError(400, "Please provide a valid email address");
      }
      const existingEmail = await User.findOne({ email: cleanEmail, _id: { $ne: user._id } });
      if (existingEmail) {
        throw new ApiError(409, "This email address is already registered to another account");
      }
      user.email = cleanEmail;
    }
  }

  // 3. Phone number handling
  if (phone !== undefined) {
    const trimmedPhone = phone ? phone.trim() : "";
    if (isPhoneUser) {
      // Phone-number login users: Phone number is read-only and cannot be changed
      if (trimmedPhone) {
        const phoneCheck = validatePhoneNumber(trimmedPhone);
        const normalizedInput = phoneCheck.isValid ? phoneCheck.normalized : trimmedPhone;
        if (normalizedInput !== user.phone && trimmedPhone !== user.phone) {
          throw new ApiError(400, "Login phone number cannot be changed");
        }
      }
    } else {
      // Google login users or Email/password login users: Phone number can be added or changed
      if (trimmedPhone) {
        const phoneCheck = validatePhoneNumber(trimmedPhone);
        if (!phoneCheck.isValid) {
          throw new ApiError(400, phoneCheck.error || "Please provide a valid phone number");
        }
        const cleanPhone = phoneCheck.normalized;

        if (cleanPhone !== user.phone) {
          // Check backend/database to ensure it is not already associated with another account
          const existingPhone = await User.findOne({ phone: cleanPhone, _id: { $ne: user._id } });
          if (existingPhone) {
            throw new ApiError(409, "This phone number is already registered to another account");
          }
          user.phone = cleanPhone;
        }
      } else if (!isPhoneUser && user.phone) {
        // Can clear non-login phone if empty
        user.phone = undefined;
      }
    }
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
  const validation = await validateAddressIntegrity(req.body);
  if (!validation.valid) {
    throw new ApiError(400, validation.error || "The entered address does not match the PIN code. Please enter the correct address/location or PIN code.");
  }

  const user = await User.findById(req.user._id);
  if (req.body.isDefault) user.addresses.forEach((a) => (a.isDefault = false));
  user.addresses.push({
    ...req.body,
    country: "India",
    line1: validation.data.line1,
    line2: validation.data.line2 || "",
    locality: validation.data.locality || "",
    city: validation.data.city,
    state: validation.data.state,
    pincode: validation.data.pincode,
    verifiedLocation: {
      isVerified: true,
      lat: validation.data.coordinates?.lat,
      lng: validation.data.coordinates?.lng,
      verifiedAt: new Date(),
      storeLocationVersion: "lakshmi_designers_v1",
      roadDistanceKm: validation.data.roadDistanceKm,
      distanceCalculatedAt: new Date(),
    },
  });
  await user.save();
  sendResponse(res, 201, "Address added successfully", user.addresses);
});

// PATCH /api/users/me/addresses/:addressId
const updateAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) throw new ApiError(404, "Address not found");

  const merged = { ...address.toObject(), ...req.body };
  const validation = await validateAddressIntegrity(merged);
  if (!validation.valid) {
    throw new ApiError(400, validation.error || "The entered address does not match the PIN code. Please enter the correct address/location or PIN code.");
  }

  if (req.body.isDefault) user.addresses.forEach((a) => (a.isDefault = false));
  Object.assign(address, {
    ...req.body,
    country: "India",
    line1: validation.data.line1,
    line2: validation.data.line2 || "",
    locality: validation.data.locality || "",
    city: validation.data.city,
    state: validation.data.state,
    pincode: validation.data.pincode,
    verifiedLocation: {
      isVerified: true,
      lat: validation.data.coordinates?.lat,
      lng: validation.data.coordinates?.lng,
      verifiedAt: new Date(),
      storeLocationVersion: "lakshmi_designers_v1",
      roadDistanceKm: validation.data.roadDistanceKm,
      distanceCalculatedAt: new Date(),
    },
  });
  await user.save();
  sendResponse(res, 200, "Address updated successfully", user.addresses);
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
