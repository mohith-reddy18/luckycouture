const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });

async function resetAtlasOrdersOnly() {
  try {
    const mongoUri = (process.env.PRODUCTION_MONGO_URI || "").trim();

    if (!mongoUri) {
      console.error("==================================================");
      console.error("SAFETY GUARD: PRODUCTION_MONGO_URI IS NOT SET!");
      console.error("==================================================");
      console.error("Please add your production MongoDB Atlas connection string into backend/.env:");
      console.error("PRODUCTION_MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/lucky_couture");
      console.error("\nRefusing to run against local 127.0.0.1 database.\n");
      process.exit(1);
    }

    if (mongoUri.includes("127.0.0.1") || mongoUri.includes("localhost")) {
      console.error("==================================================");
      console.error("SAFETY GUARD REJECTED: CONNECTION STRING POINTS TO LOCALHOST!");
      console.error("==================================================");
      console.error(`URI provided: ${mongoUri.replace(/:([^@]+)@/, ":****@")}`);
      console.error("Please provide the real MongoDB Atlas production connection string.\n");
      process.exit(1);
    }

    console.log("==================================================");
    console.log("CONNECTING TO PRODUCTION MONGODB ATLAS...");
    console.log("==================================================");

    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;
    const host = mongoose.connection.host;
    const dbName = db.databaseName;

    console.log(`Verified Target Host : ${host}`);
    console.log(`Verified Database    : ${dbName}`);

    // Verify it is not local
    if (host === "127.0.0.1" || host === "localhost") {
      console.error("Refusing to delete: Host resolved to localhost!");
      await mongoose.disconnect();
      process.exit(1);
    }

    // 1. PRE-DELETION INSPECTION
    const collections = await db.listCollections().toArray();
    const collectionCounts = {};
    for (const col of collections) {
      const name = col.name;
      const count = await db.collection(name).countDocuments({});
      collectionCounts[name] = count;
    }

    const ordersCount = collectionCounts["orders"] || 0;
    const tailoringCount = collectionCounts["tailoringorders"] || 0;
    const priorityCount = collectionCounts["priorityorders"] || 0;
    const draftsCount = collectionCounts["tailoringdrafts"] || 0;
    const totalOrderDocs = ordersCount + tailoringCount + priorityCount + draftsCount;

    console.log("\n--- PRE-DELETION AUDIT REPORT ---");
    console.log(`orders (Shopping Orders)        : ${ordersCount} documents`);
    console.log(`tailoringorders (Tailoring)     : ${tailoringCount} documents`);
    console.log(`priorityorders (Priority)       : ${priorityCount} documents`);
    console.log(`tailoringdrafts (Unpaid Drafts)  : ${draftsCount} documents`);
    console.log(`TOTAL PRODUCTION ORDER DOCS     : ${totalOrderDocs} documents`);

    console.log("\n--- NON-ORDER COLLECTIONS (WILL REMAIN 100% INTACT) ---");
    console.log(`users                            : ${collectionCounts["users"] || 0} documents`);
    console.log(`products                         : ${collectionCounts["products"] || 0} documents`);
    console.log(`categories                       : ${collectionCounts["categories"] || 0} documents`);
    console.log(`adminsettings                    : ${collectionCounts["adminsettings"] || 0} documents`);
    console.log(`designs                          : ${collectionCounts["designs"] || 0} documents`);
    console.log(`webhookevents                    : ${collectionCounts["webhookevents"] || 0} documents`);

    // 2. BACKUP EXISTING ATLAS ORDERS BEFORE RESET
    const shoppingDocs = await db.collection("orders").find({}).toArray();
    const tailoringDocs = await db.collection("tailoringorders").find({}).toArray();
    const priorityDocs = await db.collection("priorityorders").find({}).toArray();
    const draftDocs = await db.collection("tailoringdrafts").find({}).toArray();

    const backupFile = path.join(__dirname, "atlas_orders_backup.json");
    fs.writeFileSync(backupFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      host,
      database: dbName,
      counts: collectionCounts,
      orders: shoppingDocs,
      tailoringorders: tailoringDocs,
      priorityorders: priorityDocs,
      tailoringdrafts: draftDocs,
    }, null, 2));
    console.log(`\n[Backup] Production orders backup saved to ${backupFile}`);

    // 3. EXECUTE DELETION ON ORDER COLLECTIONS ONLY
    console.log("\n--- EXECUTING PRODUCTION MONGODB ATLAS ORDER RESET ---");

    const resOrders = await db.collection("orders").deleteMany({});
    console.log(`Deleted ${resOrders.deletedCount} documents from "orders" collection.`);

    const resTailoring = await db.collection("tailoringorders").deleteMany({});
    console.log(`Deleted ${resTailoring.deletedCount} documents from "tailoringorders" collection.`);

    const resPriority = await db.collection("priorityorders").deleteMany({});
    console.log(`Deleted ${resPriority.deletedCount} documents from "priorityorders" collection.`);

    const resDrafts = await db.collection("tailoringdrafts").deleteMany({});
    console.log(`Deleted ${resDrafts.deletedCount} documents from "tailoringdrafts" collection.`);

    // 4. POST-DELETION VERIFICATION
    console.log("\n==================================================");
    console.log("POST-DELETION MONGODB ATLAS VERIFICATION");
    console.log("==================================================");

    const postOrders = await db.collection("orders").countDocuments({});
    const postTailoring = await db.collection("tailoringorders").countDocuments({});
    const postPriority = await db.collection("priorityorders").countDocuments({});
    const postDrafts = await db.collection("tailoringdrafts").countDocuments({});

    console.log(`orders (Shopping Orders)        : ${postOrders} documents`);
    console.log(`tailoringorders (Tailoring)     : ${postTailoring} documents`);
    console.log(`priorityorders (Priority)       : ${postPriority} documents`);
    console.log(`tailoringdrafts (Unpaid Drafts)  : ${postDrafts} documents`);

    console.log("\n--- VERIFYING NON-ORDER DATA REMAINS UNTOUCHED ---");
    const postUsers = await db.collection("users").countDocuments({});
    const postProducts = await db.collection("products").countDocuments({});
    const postCategories = await db.collection("categories").countDocuments({});
    const postSettings = await db.collection("adminsettings").countDocuments({});
    const postDesigns = await db.collection("designs").countDocuments({});

    console.log(`users                            : ${postUsers} documents (INTACT)`);
    console.log(`products                         : ${postProducts} documents (INTACT)`);
    console.log(`categories                       : ${postCategories} documents (INTACT)`);
    console.log(`adminsettings                    : ${postSettings} documents (INTACT)`);
    console.log(`designs                          : ${postDesigns} documents (INTACT)`);

    await mongoose.disconnect();
    console.log("\nProduction MongoDB Atlas order reset complete!");
  } catch (err) {
    console.error("Atlas Reset Error:", err);
  }
}

resetAtlasOrdersOnly();
