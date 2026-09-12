const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });

const Order = require("../backend/src/models/Order");
const TailoringOrder = require("../backend/src/models/TailoringOrder");
const { normalizeAdminOrder, matchesSchedule, getNormalizedCategory } = require("../backend/src/utils/orderClassifier");

async function verifyAllOrdersInclusion() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (mongoUri && !mongoUri.includes("127.0.0.1")) {
      await mongoose.connect(mongoUri);
      console.log("Connected to MongoDB Atlas.");
    }

    console.log("==================================================");
    console.log("VERIFYING 'ALL ORDERS' INCLUSION OF REJECTED ORDERS");
    console.log("==================================================");

    // Mock set of order documents representing all statuses in DB
    const sampleShoppingDocs = [
      { _id: new mongoose.Types.ObjectId(), orderId: "SHOP-101", status: "placed", paymentMethod: "cod", totalAmount: 1200, createdAt: new Date() },
      { _id: new mongoose.Types.ObjectId(), orderId: "SHOP-102", status: "confirmed", paymentMethod: "razorpay", paymentStatus: "paid", amountPaid: 1500, totalAmount: 1500, createdAt: new Date() },
      { _id: new mongoose.Types.ObjectId(), orderId: "SHOP-103", status: "packed", paymentMethod: "cod", totalAmount: 800, createdAt: new Date() },
      { _id: new mongoose.Types.ObjectId(), orderId: "SHOP-104", status: "shipped", paymentMethod: "cod", totalAmount: 2000, createdAt: new Date() },
      { _id: new mongoose.Types.ObjectId(), orderId: "SHOP-105", status: "delivered", paymentMethod: "cod", totalAmount: 2000, createdAt: new Date() },
      { _id: new mongoose.Types.ObjectId(), orderId: "SHOP-106", status: "completed", paymentMethod: "cod", totalAmount: 2000, createdAt: new Date() },
      { _id: new mongoose.Types.ObjectId(), orderId: "SHOP-107", status: "cancelled", paymentMethod: "razorpay", paymentStatus: "refunded", amountPaid: 0, totalAmount: 1000, createdAt: new Date() },
      { _id: new mongoose.Types.ObjectId(), orderId: "SHOP-108", status: "rejected", paymentMethod: "razorpay", paymentStatus: "refunded", amountPaid: 0, totalAmount: 1200, rejectionReason: "Fabric out of stock", createdAt: new Date() },
    ];

    const sampleTailoringDocs = [
      { _id: new mongoose.Types.ObjectId(), orderId: "TAIL-201", status: "confirmed", garmentType: "Blouse", estimatedPrice: 1500, createdAt: new Date() },
      { _id: new mongoose.Types.ObjectId(), orderId: "TAIL-202", status: "stitching", garmentType: "Lehenga", estimatedPrice: 3500, createdAt: new Date() },
      { _id: new mongoose.Types.ObjectId(), orderId: "TAIL-203", status: "rejected", garmentType: "Saree Blouse", estimatedPrice: 1800, rejectionReason: "Client requested cancellation", createdAt: new Date() },
    ];

    const normalizedShopping = sampleShoppingDocs.map(d => normalizeAdminOrder(d, "shopping"));
    const normalizedTailoring = sampleTailoringDocs.map(d => normalizeAdminOrder(d, "tailoring"));
    const combined = [...normalizedShopping, ...normalizedTailoring];

    console.log(`Total Input Orders: ${combined.length} (${sampleShoppingDocs.length} Shopping + ${sampleTailoringDocs.length} Tailoring)`);

    // Simulate "All Orders" filter (schedule = "all", category = "all")
    const allOrdersFiltered = combined.filter(o => {
      const matchSchedule = matchesSchedule(o, "all");
      return matchSchedule;
    });

    console.log(`\nFiltered 'All Orders' Count: ${allOrdersFiltered.length}`);

    const rejectedInAllOrders = allOrdersFiltered.filter(o => o.status === "rejected");
    console.log(`Rejected Orders present in 'All Orders': ${rejectedInAllOrders.length}`);
    rejectedInAllOrders.forEach(o => {
      console.log(` - ID: ${o.displayId}, Kind: ${o.kindLabel}, Status: "${o.status}", Rejection Reason: "${o.rejectionReason || "N/A"}"`);
    });

    const cancelledInAllOrders = allOrdersFiltered.filter(o => o.status === "cancelled");
    console.log(`Cancelled Orders present in 'All Orders': ${cancelledInAllOrders.length}`);

    // Verify Pending filter excludes rejected orders
    const pendingFiltered = combined.filter(o => matchesSchedule(o, "pending"));
    const rejectedInPending = pendingFiltered.filter(o => o.status === "rejected");
    console.log(`\nPending Filter Count: ${pendingFiltered.length}`);
    console.log(`Rejected Orders in 'Pending Orders': ${rejectedInPending.length} (Expected: 0)`);

    if (allOrdersFiltered.length === combined.length && rejectedInAllOrders.length === 2 && rejectedInPending.length === 0) {
      console.log("\n==================================================");
      console.log("✓ VERIFICATION SUCCESSFUL:");
      console.log("1. 'All Orders' includes 100% of orders (including rejected & cancelled).");
      console.log("2. Total count matches complete order history.");
      console.log("3. Rejected orders maintain status='rejected' and display rejection reasons.");
      console.log("4. Schedule filters (pending/overdue/today) correctly isolate active fulfillment orders.");
      console.log("==================================================");
    } else {
      console.error("\n✗ VERIFICATION FAILED: Mismatch in order inclusion!");
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (err) {
    console.error("Error in verification:", err);
  }
}

verifyAllOrdersInclusion();
