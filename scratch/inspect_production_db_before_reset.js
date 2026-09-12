const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });

async function inspectProductionDb() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error("MONGO_URI not set!");
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;
    const host = mongoose.connection.host;
    const dbName = db.databaseName;

    console.log("==================================================");
    console.log("PRODUCTION MONGODB INSPECTION BEFORE RESET");
    console.log("==================================================");
    console.log(`Target Host: ${host}`);
    console.log(`Database Name: ${dbName}`);

    const collections = await db.listCollections().toArray();
    console.log(`\nFound ${collections.length} total collections in database:\n`);

    const collectionCounts = {};
    for (const col of collections) {
      const name = col.name;
      const count = await db.collection(name).countDocuments({});
      collectionCounts[name] = count;
      console.log(` - ${name.padEnd(25)} : ${count} documents`);
    }

    console.log("\n--- ORDER COLLECTIONS IDENTIFIED ---");
    console.log(`orders (Shopping Orders)        : ${collectionCounts["orders"] || 0}`);
    console.log(`tailoringorders (Tailoring)     : ${collectionCounts["tailoringorders"] || 0}`);
    console.log(`priorityorders (Priority)       : ${collectionCounts["priorityorders"] || 0}`);
    console.log(`tailoringdrafts (Unpaid Drafts)  : ${collectionCounts["tailoringdrafts"] || 0}`);

    console.log("\n--- OTHER APPLICATION COLLECTIONS (MUST REMAIN INTACT) ---");
    console.log(`users                            : ${collectionCounts["users"] || 0}`);
    console.log(`products                         : ${collectionCounts["products"] || 0}`);
    console.log(`categories                       : ${collectionCounts["categories"] || 0}`);
    console.log(`adminsettings                    : ${collectionCounts["adminsettings"] || 0}`);
    console.log(`designs                          : ${collectionCounts["designs"] || 0}`);
    console.log(`blogposts                        : ${collectionCounts["blogposts"] || 0}`);
    console.log(`reviews                          : ${collectionCounts["reviews"] || 0}`);
    console.log(`contactmessages                  : ${collectionCounts["contactmessages"] || 0}`);

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error inspecting database:", err);
  }
}

inspectProductionDb();
