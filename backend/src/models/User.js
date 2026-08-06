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
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[+]?[0-9\s-]{7,15}$/, "Please provide a valid phone number"],
    },
    password: { type: String, required: [true, "Password is required"], minlength: 8, select: false },
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
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpire;
  delete obj.emailVerificationToken;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
