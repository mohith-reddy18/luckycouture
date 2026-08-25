require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const Order = require("../src/models/Order");
const User = require("../src/models/User");
const { generateOrderId } = require("../src/utils/generateOrderId");
const { calculateOrderFinancials, validateOrderCompletion } = require("../src/utils/paymentCalculator");
const { normalizeAdminOrder } = require("../src/utils/orderClassifier");

async function runRootCauseVerification() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("================================================================================");
  console.log("TESTING EXACT ORDER FLOW & SINGLE SOURCE OF TRUTH (SHOP-187576213286118 SCENARIO)");
  console.log("================================================================================\n");

  let customer = await User.findOne({ role: "customer" });
  if (!customer) {
    customer = await User.create({
      name: "Root Cause Customer",
      email: "rootcause@test.com",
      phone: `9${Date.now().toString().slice(-9)}`,
      password: "password123",
      role: "customer",
    });
  }

  // --- STAGE 1: Order created with ₹27 total, ₹0 paid ---
  console.log("--- STAGE 1: Order Created (₹27 Total, ₹0 Paid) ---");
  const testOrder = await Order.create({
    orderId: generateOrderId("SHOP-"),
    user: customer._id,
    items: [{ name: "Handcrafted Item", price: 27, quantity: 1 }],
    subtotal: 27,
    totalAmount: 27,
    total: 27,
    paymentMethod: "cod",
    paymentStatus: "pending",
    amountPaid: 0,
    advancePaid: 0,
    status: "placed",
    payments: [],
  });

  // A. Check calculation engine
  const fin1 = calculateOrderFinancials(testOrder);
  console.log("Engine Financials Stage 1:", {
    totalAmount: fin1.totalAmount,
    advanceRequired: fin1.advanceRequired,
    totalPaid: fin1.totalPaid,
    advancePaid: fin1.advancePaid,
    remainingBalance: fin1.remainingBalance,
    paymentStatus: fin1.paymentStatus,
    paymentPercentage: fin1.paymentPercentage,
  });

  // B. Check Admin Orders list normalization
  const adminNorm1 = normalizeAdminOrder(testOrder, "shopping");
  console.log("Admin Orders Row Stage 1:", {
    totalAmount: adminNorm1.totalAmount,
    amountPaid: adminNorm1.amountPaid,
    remainingBalance: adminNorm1.remainingBalance,
    advancePaid: adminNorm1.advancePaid,
    paymentStatus: adminNorm1.paymentStatus,
    isPendingAdvance: adminNorm1.isPendingAdvance,
  });

  // C. Check Complete validation
  const val1 = validateOrderCompletion(testOrder);
  console.log("Complete Validation Stage 1:", val1);

  if (
    fin1.totalPaid === 0 &&
    fin1.advanceRequired === 8 &&
    fin1.advancePaid === 0 &&
    fin1.remainingBalance === 27 &&
    adminNorm1.amountPaid === 0 &&
    adminNorm1.remainingBalance === 27 &&
    adminNorm1.isPendingAdvance === true &&
    val1.canComplete === false &&
    val1.reason === "advance_unpaid" &&
    val1.message === "Cannot complete order. The required 30% advance payment has not been received."
  ) {
    console.log("✓ PASS Stage 1: All screens/endpoints agree: ₹0 paid, ₹8 advance required, ₹27 due, Advance unpaid.\n");
  } else {
    throw new Error("Stage 1 Failed");
  }

  // --- STAGE 2: Record ₹8 Advance Payment ---
  console.log("--- STAGE 2: Record ₹8 Advance Payment ---");
  testOrder.payments.push({
    paymentType: "advance",
    paymentMethod: "cash",
    amount: 8,
    status: "captured",
    paidAt: new Date(),
  });
  const finAfterAdv = calculateOrderFinancials(testOrder);
  testOrder.amountPaid = finAfterAdv.totalPaid;
  testOrder.advancePaid = finAfterAdv.advancePaid;
  testOrder.amountDue = finAfterAdv.remainingBalance;
  testOrder.paymentStatus = finAfterAdv.paymentStatus;
  await testOrder.save();

  const freshOrder2 = await Order.findById(testOrder._id);
  const fin2 = calculateOrderFinancials(freshOrder2);
  const adminNorm2 = normalizeAdminOrder(freshOrder2, "shopping");
  const val2 = validateOrderCompletion(freshOrder2);

  console.log("Engine Financials Stage 2:", {
    totalAmount: fin2.totalAmount,
    totalPaid: fin2.totalPaid,
    advancePaid: fin2.advancePaid,
    remainingBalance: fin2.remainingBalance,
    paymentPercentage: fin2.paymentPercentage,
    paymentStatus: fin2.paymentStatus,
  });
  console.log("Complete Validation Stage 2:", val2);

  if (
    fin2.totalPaid === 8 &&
    fin2.advancePaid === 8 &&
    fin2.remainingBalance === 19 &&
    fin2.paymentPercentage === 30 &&
    adminNorm2.amountPaid === 8 &&
    adminNorm2.remainingBalance === 19 &&
    adminNorm2.isAdvancePaid === true &&
    adminNorm2.isFullyPaid === false &&
    val2.canComplete === false &&
    val2.reason === "balance_unpaid" &&
    val2.message === "30% advance received. Remaining balance of ₹19 is still unpaid."
  ) {
    console.log("✓ PASS Stage 2: All screens/endpoints agree: ₹8 verified paid (30%), ₹19 balance due, Case B message.\n");
  } else {
    throw new Error("Stage 2 Failed");
  }

  // --- STAGE 3: Record Remaining ₹19 Balance Payment ---
  console.log("--- STAGE 3: Record Remaining ₹19 Balance Payment ---");
  freshOrder2.payments.push({
    paymentType: "balance",
    paymentMethod: "pos",
    amount: 19,
    status: "captured",
    paidAt: new Date(),
  });
  const finAfterBal = calculateOrderFinancials(freshOrder2);
  freshOrder2.amountPaid = finAfterBal.totalPaid;
  freshOrder2.advancePaid = finAfterBal.advancePaid;
  freshOrder2.amountDue = finAfterBal.remainingBalance;
  freshOrder2.paymentStatus = finAfterBal.paymentStatus;
  await freshOrder2.save();

  const freshOrder3 = await Order.findById(testOrder._id);
  const fin3 = calculateOrderFinancials(freshOrder3);
  const adminNorm3 = normalizeAdminOrder(freshOrder3, "shopping");
  const val3 = validateOrderCompletion(freshOrder3);

  console.log("Engine Financials Stage 3:", {
    totalAmount: fin3.totalAmount,
    totalPaid: fin3.totalPaid,
    remainingBalance: fin3.remainingBalance,
    paymentPercentage: fin3.paymentPercentage,
    paymentStatus: fin3.paymentStatus,
  });
  console.log("Complete Validation Stage 3:", val3);

  if (
    fin3.totalPaid === 27 &&
    fin3.remainingBalance === 0 &&
    fin3.paymentPercentage === 100 &&
    fin3.isFullyPaid === true &&
    adminNorm3.amountPaid === 27 &&
    adminNorm3.remainingBalance === 0 &&
    adminNorm3.isFullyPaid === true &&
    val3.canComplete === true &&
    val3.message === null
  ) {
    console.log("✓ PASS Stage 3: All screens/endpoints agree: 100% paid in full, ₹0 remaining, Complete allowed.\n");
  } else {
    throw new Error("Stage 3 Failed");
  }

  // Clean up
  await Order.findByIdAndDelete(testOrder._id);

  console.log("================================================================================");
  console.log("SINGLE SOURCE OF TRUTH FULLY VERIFIED ACROSS ALL STAGES! 🎉");
  console.log("================================================================================");

  await mongoose.disconnect();
}

runRootCauseVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
