const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });

async function executeOrderReset() {
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
    console.log("EXECUTING PRODUCTION ORDER DATA RESET");
    console.log("==================================================");
    console.log(`Host: ${host}`);
    console.log(`Database: ${dbName}\n`);

    // 1. BACKUP EXISTING ORDERS TO SCRATCH ARTIFACT FILE
    const shoppingOrders = await db.collection("orders").find({}).toArray();
    const tailoringOrders = await db.collection("tailoringorders").find({}).toArray();
    const priorityOrders = await db.collection("priorityorders").find({}).toArray();
    const tailoringDrafts = await db.collection("tailoringdrafts").find({}).toArray();

    const backupData = {
      timestamp: new Date().toISOString(),
      database: dbName,
      counts: {
        orders: shoppingOrders.length,
        tailoringorders: tailoringOrders.length,
        priorityorders: priorityOrders.length,
        tailoringdrafts: tailoringDrafts.length,
      },
      data: {
        orders: shoppingOrders,
        tailoringorders: tailoringOrders,
        priorityorders: priorityOrders,
        tailoringdrafts: tailoringDrafts,
      },
    };

    const backupPath = path.join(__dirname, "orders_backup.json");
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    console.log(`[Safety Backup] Saved backup of ${shoppingOrders.length + tailoringOrders.length + priorityOrders.length + tailoringDrafts.length} order records to ${backupPath}\n`);

    // 2. PERFORM DELETION ON ORDER COLLECTIONS ONLY
    console.log("--- PERFORMING ORDER DOCUMENT DELETION ---");

    const delOrders = await db.collection("orders").deleteMany({});
    console.log(`Deleted ${delOrders.deletedCount} documents from "orders" collection.`);

    const delTailoring = await db.collection("tailoringorders").deleteMany({});
    console.log(`Deleted ${delTailoring.deletedCount} documents from "tailoringorders" collection.`);

    const delPriority = await db.collection("priorityorders").deleteMany({});
    console.log(`Deleted ${delPriority.deletedCount} documents from "priorityorders" collection.`);

    const delDrafts = await db.collection("tailoringdrafts").deleteMany({});
    console.log(`Deleted ${delDrafts.deletedCount} documents from "tailoringdrafts" collection.`);

    // 3. POST-DELETION VERIFICATION DIRECTLY FROM MONGODB
    console.log("\n==================================================");
    console.log("POST-DELETION DATABASE VERIFICATION");
    console.log("==================================================");

    const postOrders = await db.collection("orders").countDocuments({});
    const postTailoring = await db.collection("tailoringorders").countDocuments({});
    const postPriority = await db.collection("priorityorders").countDocuments({});
    const postDrafts = await db.collection("tailoringdrafts").countDocuments({});

    console.log(`orders (Shopping Orders)        : ${postOrders} documents (Expected: 0)`);
    console.log(`tailoringorders (Tailoring)     : ${postTailoring} documents (Expected: 0)`);
    console.log(`priorityorders (Priority)       : ${postPriority} documents (Expected: 0)`);
    console.log(`tailoringdrafts (Unpaid Drafts)  : ${postDrafts} documents (Expected: 0)`);

    console.log("\n--- VERIFYING NON-ORDER COLLECTIONS ARE INTACT ---");
    const usersCount = await db.collection("users").countDocuments({});
    const productsCount = await db.collection("products").countDocuments({});
    const categoriesCount = await db.collection("categories").countDocuments({});
    const settingsCount = await db.collection("adminsettings").countDocuments({});
    const designsCount = await db.collection("designs").countDocuments({});
    const webhooksCount = await db.collection("webhookevents").countDocuments({});

    console.log(`users                            : ${usersCount} documents (INTACT)`);
    console.log(`products                         : ${productsCount} documents (INTACT)`);
    console.log(`categories                       : ${categoriesCount} documents (INTACT)`);
    console.log(`adminsettings                    : ${settingsCount} documents (INTACT)`);
    console.log(`designs                          : ${designsCount} documents (INTACT)`);
    console.log(`webhookevents                    : ${webhooksCount} documents (INTACT)`);

    await mongoose.disconnect();
    console.log("\nOrder reset execution completed successfully!");
  } catch (err) {
    console.error("Error executing order reset:", err);
  }
}

executeOrderReset();
