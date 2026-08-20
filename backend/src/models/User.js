const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: "Home" },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true, timestamps: true }
);

const measurementProfileSchema = new mongoose.Schema(
  {
    profileName: { type: String, required: true }, // e.g. "Myself", "Daughter"
    relationship: { type: String, default: "Self" },
    gender: { type: String, enum: ["female", "male", "other"], default: "female" },
    category: { type: String, required: true }, // e.g. "Blouse", "Dress"
    measurements: { type: Map, of: Number, default: {} },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true, timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      match: [/^[+]?[0-9\s-]{7,15}$/, "Please provide a valid phone number"],
    },
    googleId: { type: String, unique: true, sparse: true },
    authProvider: { type: String, enum: ["google", "phone", "email"] },
    password: { type: String, select: false },
    hasPassword: { type: Boolean, default: false },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    avatar: { url: String, publicId: String },
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    addresses: [addressSchema],
    measurementProfiles: [measurementProfileSchema],
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    emailVerificationToken: String,
    lastLoginAt: Date,
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (this.password) {
    this.hasPassword = true;
  }
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.generateResetToken = function generateResetToken() {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
  return resetToken;
};

userSchema.methods.toSafeObject = function toSafeObject() {
  const obj = this.toObject({ virtuals: true });
  obj.hasPassword = Boolean(this.hasPassword || this.password);
  if (!obj.authProvider) {
    if (this.googleId) obj.authProvider = "google";
    else if (this.phone && !this.email) obj.authProvider = "phone";
    else if (this.email && !this.phone) obj.authProvider = "email";
    else if (this.phone && this.email) {
      obj.authProvider = this.role === "admin" ? "email" : "phone";
    } else {
      obj.authProvider = "email";
    }
  }
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpire;
  delete obj.emailVerificationToken;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
