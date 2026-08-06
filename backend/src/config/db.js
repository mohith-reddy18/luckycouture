const mongoose = require("mongoose");

/**
 * Connects to MongoDB using Mongoose.
 * Exits the process on failure so the process manager (pm2/systemd/docker)
 * can restart it rather than running the API against a dead DB connection.
 */
async function connectDB() {
  if (!process.env.MONGO_URI) {
    console.error(
      "\nMONGO_URI is not set.\n" +
        "  → Copy backend/.env.example to backend/.env and fill in MONGO_URI\n" +
        "    (a local MongoDB, or a free MongoDB Atlas connection string both work).\n"
    );
    process.exit(1);
  }

  try {
    mongoose.set("strictQuery", true);
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(
      `\nCould not connect to MongoDB: ${error.message}\n` +
        "  → Check that MONGO_URI in backend/.env is correct and that MongoDB is running/reachable.\n"
    );
    process.exit(1);
  }
}

module.exports = connectDB;
