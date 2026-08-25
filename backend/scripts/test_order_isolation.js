require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const Order = require("../src/models/Order");
const Product = require("../src/models/Product");
const User = require("../src/models/User");
const { generateOrderId } = require("../src/utils/generateOrderId");
const { restoreOrderStock } = require("../src/utils/inventoryManager");

async function runIsolationTests() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("================================================================================");
  console.log("STARTING COMPREHENSIVE ORDER ISOLATION TEST SUITE");
  console.log("================================================================================\n");

  let customer1, customer2, product1, product2;

  // Setup test customer and products
  customer1 = await User.findOne({ email: "customer1@test.com" });
  if (!customer1) {
    customer1 = await User.findOne({ role: "customer" });
  }
  if (!customer1) {
    customer1 = await User.create({
      name: "Customer One",
      email: "customer1@test.com",
      phone: `9${Date.now().toString().slice(-9)}`,
      password: "password123",
      role: "customer",
    });
  }

  customer2 = await User.findOne({ email: "customer2@test.com" });
  if (!customer2) {
    customer2 = await User.create({
      name: "Customer Two",
      email: "customer2@test.com",
      phone: `8${Date.now().toString().slice(-9)}`,
      password: "password123",
      role: "customer",
    });
  }

  product1 = await Product.findOne();
  if (!product1) {
    product1 = await Product.create({
      name: "Test Silk Saree",
      slug: "test-silk-saree",
      price: 2500,
      mrp: 3000,
      category: new mongoose.Types.ObjectId(),
      description: "Test Saree Description",
      stock: 10,
      colorVariants: [
        {
          color: "Red",
          inventory: [{ size: "Free Size", quantity: 10 }],
          sizes: ["Free Size"],
        },
      ],
    });
  }

  product2 = await Product.findOne({ _id: { $ne: product1._id } });
  if (!product2) {
    product2 = await Product.create({
      name: "Test Cotton Kurti",
      slug: "test-cotton-kurti",
      price: 1500,
      mrp: 2000,
      category: new mongoose.Types.ObjectId(),
      description: "Test Kurti Description",
      stock: 10,
      colorVariants: [
        {
          color: "Blue",
          inventory: [{ size: "M", quantity: 10 }],
          sizes: ["M"],
        },
      ],
    });
  }

  // Helper to create test orders
  async function createTestOrder(overrides = {}) {
    return await Order.create({
      orderId: generateOrderId("SHOP-"),
      user: customer1._id,
      items: [
        {
          product: product1._id,
          name: product1.name,
          price: 2500,
          quantity: 1,
          size: "Free Size",
          color: "Red",
        },
      ],
      subtotal: 2500,
      totalAmount: 2500,
      total: 2500,
      paymentMethod: "cod",
      paymentStatus: "paid",
      amountPaid: 2500,
      status: "confirmed",
      stockDeducted: true,
      stockRestored: false,
      ...overrides,
    });
  }

  // --- TEST 1: Complete Order A among A, B, C ---
  console.log("--- TEST 1: Complete Order A (from A, B, C) ---");
  const ordA = await createTestOrder({ status: "confirmed" });
  const ordB = await createTestOrder({ status: "confirmed" });
  const ordC = await createTestOrder({ status: "confirmed" });

  ordA.status = "completed";
  ordA.completedAt = new Date();
  await ordA.save();

  const verifyA1 = await Order.findById(ordA._id);
  const verifyB1 = await Order.findById(ordB._id);
  const verifyC1 = await Order.findById(ordC._id);

  if (verifyA1.status === "completed" && verifyB1.status === "confirmed" && verifyC1.status === "confirmed") {
    console.log("✓ PASS: Order A is COMPLETED. Order B and Order C remain CONFIRMED and completely unchanged.");
  } else {
    throw new Error(`Test 1 Failed: A=${verifyA1.status}, B=${verifyB1.status}, C=${verifyC1.status}`);
  }

  // --- TEST 2: Reject Order B among A, B, C ---
  console.log("\n--- TEST 2: Reject Order B (from A, B, C) ---");
  ordB.status = "rejected";
  ordB.rejectionReason = "Item damaged in transit";
  ordB.rejectedAt = new Date();
  await ordB.save();

  const verifyA2 = await Order.findById(ordA._id);
  const verifyB2 = await Order.findById(ordB._id);
  const verifyC2 = await Order.findById(ordC._id);

  if (verifyA2.status === "completed" && verifyB2.status === "rejected" && verifyC2.status === "confirmed") {
    console.log("✓ PASS: Order B is REJECTED. Order A remains COMPLETED and Order C remains CONFIRMED.");
  } else {
    throw new Error(`Test 2 Failed: A=${verifyA2.status}, B=${verifyB2.status}, C=${verifyC2.status}`);
  }

  // --- TEST 3: Complete A, then Reject B independence ---
  console.log("\n--- TEST 3: Independence of Sequential Complete & Reject ---");
  const ordD = await createTestOrder({ status: "confirmed" });
  const ordE = await createTestOrder({ status: "confirmed" });

  ordD.status = "completed";
  await ordD.save();

  ordE.status = "rejected";
  ordE.rejectionReason = "Customer request";
  await ordE.save();

  const verifyD = await Order.findById(ordD._id);
  const verifyE = await Order.findById(ordE._id);

  if (verifyD.status === "completed" && verifyE.status === "rejected") {
    console.log("✓ PASS: Sequential Complete on D and Reject on E executed with strict isolation.");
  } else {
    throw new Error(`Test 3 Failed: D=${verifyD.status}, E=${verifyE.status}`);
  }

  // --- TEST 4: Two orders from the same customer ---
  console.log("\n--- TEST 4: Two orders from the same customer ---");
  const ordCust1_1 = await createTestOrder({ user: customer1._id, status: "confirmed" });
  const ordCust1_2 = await createTestOrder({ user: customer1._id, status: "confirmed" });

  ordCust1_1.status = "completed";
  await ordCust1_1.save();

  const verifyCust1_1 = await Order.findById(ordCust1_1._id);
  const verifyCust1_2 = await Order.findById(ordCust1_2._id);

  if (verifyCust1_1.status === "completed" && verifyCust1_2.status === "confirmed") {
    console.log("✓ PASS: Completing Customer 1's first order does NOT affect Customer 1's second order.");
  } else {
    throw new Error(`Test 4 Failed: Order1=${verifyCust1_1.status}, Order2=${verifyCust1_2.status}`);
  }

  // --- TEST 5: Two orders containing the same product ---
  console.log("\n--- TEST 5: Two orders containing the same product ---");
  const ordProd1_1 = await createTestOrder({ items: [{ product: product1._id, name: product1.name, price: 2500, quantity: 1, color: "Red", size: "Free Size" }], status: "confirmed" });
  const ordProd1_2 = await createTestOrder({ items: [{ product: product1._id, name: product1.name, price: 2500, quantity: 1, color: "Red", size: "Free Size" }], status: "confirmed" });

  ordProd1_1.status = "completed";
  await ordProd1_1.save();

  const verifyProd1_1 = await Order.findById(ordProd1_1._id);
  const verifyProd1_2 = await Order.findById(ordProd1_2._id);

  if (verifyProd1_1.status === "completed" && verifyProd1_2.status === "confirmed") {
    console.log("✓ PASS: Completing order with Product 1 does NOT modify other orders with Product 1.");
  } else {
    throw new Error(`Test 5 Failed`);
  }

  // --- TEST 6: Two orders with the same amount ---
  console.log("\n--- TEST 6: Two orders with identical amount ---");
  const ordAmt1 = await createTestOrder({ total: 1800, totalAmount: 1800, status: "confirmed" });
  const ordAmt2 = await createTestOrder({ total: 1800, totalAmount: 1800, status: "confirmed" });

  ordAmt1.status = "completed";
  await ordAmt1.save();

  const verifyAmt1 = await Order.findById(ordAmt1._id);
  const verifyAmt2 = await Order.findById(ordAmt2._id);

  if (verifyAmt1.status === "completed" && verifyAmt2.status === "confirmed") {
    console.log("✓ PASS: Completing order with ₹1,800 does NOT affect another ₹1,800 order.");
  } else {
    throw new Error(`Test 6 Failed`);
  }

  // --- TEST 7: Two orders with same payment method ---
  console.log("\n--- TEST 7: Two orders with same payment method ---");
  const ordPay1 = await createTestOrder({ paymentMethod: "razorpay", paymentStatus: "paid", amountPaid: 2500, status: "confirmed" });
  const ordPay2 = await createTestOrder({ paymentMethod: "razorpay", paymentStatus: "paid", amountPaid: 2500, status: "confirmed" });

  ordPay1.status = "completed";
  await ordPay1.save();

  const verifyPay1 = await Order.findById(ordPay1._id);
  const verifyPay2 = await Order.findById(ordPay2._id);

  if (verifyPay1.status === "completed" && verifyPay2.status === "confirmed") {
    console.log("✓ PASS: Completing Razorpay order does NOT affect other Razorpay orders.");
  } else {
    throw new Error(`Test 7 Failed`);
  }

  // --- TEST 8: Rapid concurrent Complete mutations ---
  console.log("\n--- TEST 8: Rapid concurrent Complete mutations on two separate orders ---");
  const ordConc1 = await createTestOrder({ status: "confirmed" });
  const ordConc2 = await createTestOrder({ status: "confirmed" });

  await Promise.all([
    (async () => {
      ordConc1.status = "completed";
      ordConc1.completedAt = new Date();
      await ordConc1.save();
    })(),
    (async () => {
      ordConc2.status = "completed";
      ordConc2.completedAt = new Date();
      await ordConc2.save();
    })(),
  ]);

  const verifyConc1 = await Order.findById(ordConc1._id);
  const verifyConc2 = await Order.findById(ordConc2._id);

  if (verifyConc1.status === "completed" && verifyConc2.status === "completed") {
    console.log("✓ PASS: Parallel concurrent Complete actions updated each exact order independently.");
  } else {
    throw new Error(`Test 8 Failed`);
  }

  // --- TEST 9: Admin query & normalization persistence ---
  console.log("\n--- TEST 9: Admin orders dataset query reflection ---");
  const allOrdersInDB = await Order.find({ _id: { $in: [ordA._id, ordB._id, ordC._id] } });
  const mapById = {};
  allOrdersInDB.forEach(o => mapById[o._id.toString()] = o.status);

  if (mapById[ordA._id.toString()] === "completed" && mapById[ordB._id.toString()] === "rejected" && mapById[ordC._id.toString()] === "confirmed") {
    console.log("✓ PASS: Admin query reflects exact independent statuses (A=completed, B=rejected, C=confirmed).");
  } else {
    throw new Error(`Test 9 Failed`);
  }

  // --- TEST 10: Inventory restoration isolation upon rejection ---
  console.log("\n--- TEST 10: Inventory restoration isolation ---");
  const initialStock = 10;
  product2.stock = initialStock;
  product2.colorVariants = [{ color: "Blue", inventory: [{ size: "M", quantity: initialStock }], sizes: ["M"] }];
  await product2.save();

  const ordInvA = await createTestOrder({
    items: [{ product: product2._id, name: product2.name, price: 1500, quantity: 2, color: "Blue", size: "M" }],
    stockDeducted: true,
    stockRestored: false,
    status: "confirmed",
  });

  const ordInvB = await createTestOrder({
    items: [{ product: product2._id, name: product2.name, price: 1500, quantity: 3, color: "Blue", size: "M" }],
    stockDeducted: true,
    stockRestored: false,
    status: "confirmed",
  });

  // Reject only ordInvA
  await restoreOrderStock(ordInvA);
  ordInvA.status = "rejected";
  await ordInvA.save();

  const freshProduct2 = await Product.findById(product2._id);
  const freshInvB = await Order.findById(ordInvB._id);

  const restoredVariant = freshProduct2.colorVariants.find(v => v.color === "Blue")?.inventory.find(i => i.size === "M");

  if (restoredVariant.quantity === initialStock + 2 && freshInvB.stockRestored === false && freshInvB.status === "confirmed") {
    console.log("✓ PASS: Stock restored by exact quantity (2 units) for Order A only. Order B inventory and status remained untouched.");
  } else {
    throw new Error(`Test 10 Failed: variantQty=${restoredVariant.quantity}, ordB.restored=${freshInvB.stockRestored}`);
  }

  // Clean up created test orders
  await Order.deleteMany({ _id: { $in: [
    ordA._id, ordB._id, ordC._id, ordD._id, ordE._id,
    ordCust1_1._id, ordCust1_2._id, ordProd1_1._id, ordProd1_2._id,
    ordAmt1._id, ordAmt2._id, ordPay1._id, ordPay2._id,
    ordConc1._id, ordConc2._id, ordInvA._id, ordInvB._id
  ] } });

  console.log("\n================================================================================");
  console.log("ALL 10 ORDER ISOLATION TESTS PASSED SUCCESSFULLY! 🎉");
  console.log("================================================================================");

  await mongoose.disconnect();
}

runIsolationTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
