/**
 * seedAdmin.js
 * Run once to create the Lucky Couture admin user in MongoDB.
 * Usage: node scripts/seedAdmin.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../src/models/User");

const ADMIN_EMAIL    = "mohithreddybade18@gmail.com";
const ADMIN_PASSWORD = "mohith_2006";
const ADMIN_NAME     = "Mohith Reddy";

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { family: 4 });
    console.log("✅  Connected to MongoDB");

    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      if (existing.role !== "admin") {
        existing.role = "admin";
        await existing.save({ validateBeforeSave: false });
        console.log(`✅  Existing account upgraded to admin: ${ADMIN_EMAIL}`);
      } else {
        console.log(`ℹ️   Admin account already exists: ${ADMIN_EMAIL}`);
      }
    } else {
      await User.create({
        name:     ADMIN_NAME,
        email:    ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role:     "admin",
        isActive: true,
        isEmailVerified: true,
      });
      console.log(`✅  Admin user created: ${ADMIN_EMAIL}`);
    }
  } catch (err) {
    console.error("❌  Seed failed:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌  Disconnected from MongoDB");
  }
}

seedAdmin();
