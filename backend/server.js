const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });


const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  // Auto-seed blogs and site settings if missing
  try {
    const BlogPost = require("./src/models/BlogPost");
    const count = await BlogPost.countDocuments();
    if (count === 0) {
      const { seedBlogs } = require("./src/utils/seedBlogs");
      await seedBlogs();
      console.log("Seeded initial blog articles into MongoDB.");
    }
    const AdminSetting = require("./src/models/AdminSetting");
    await AdminSetting.getSingleton();
  } catch (err) {
    console.warn("Initial DB seed check warning:", err.message);
  }

  const server = app.listen(PORT, () => {
    console.log(`Lucky Couture API listening on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
  });

  // Fail loudly instead of leaving the process in a half-broken state.
  process.on("unhandledRejection", (err) => {
    console.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });

  process.on("SIGTERM", () => {
    console.log("SIGTERM received — shutting down gracefully");
    server.close(() => process.exit(0));
  });
}

start();
