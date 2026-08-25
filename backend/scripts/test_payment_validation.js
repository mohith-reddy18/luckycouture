require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const Order = require("../src/models/Order");
const TailoringOrder = require("../src/models/TailoringOrder");
const User = require("../src/models/User");
const { generateOrderId } = require("../src/utils/generateOrderId");
const { calculateOrderFinancials, validateOrderCompletion } = require("../src/utils/paymentCalculator");

async function runPaymentValidationTests() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("================================================================================");
  console.log("STARTING AUTHORITATIVE PAYMENT VALIDATION & COMPLETE ORDER TEST SUITE");
  console.log("================================================================================\n");

  let customer = await User.findOne({ role: "customer" });
  if (!customer) {
    customer = await User.create({
      name: "Payment Test Customer",
      email: "paytest@test.com",
      phone: `9${Date.now().toString().slice(-9)}`,
      password: "password123",
      role: "customer",
    });
  }

  // --- TEST A: ₹27 order, ₹0 paid ---
  console.log("--- TEST A: ₹27 Order, ₹0 Paid ---");
  const orderA = {
    totalAmount: 27,
    amountPaid: 0,
    paymentStatus: "pending",
    payments: [],
  };
  const finA = calculateOrderFinancials(orderA);
  const valA = validateOrderCompletion(orderA);

  console.log(`Financials A: total=${finA.totalAmount}, advanceRequired=${finA.advanceRequired}, totalPaid=${finA.totalPaid}, isAdvancePaid=${finA.isAdvancePaid}, percent=${finA.paymentPercentage}%`);
  console.log(`Validation A: canComplete=${valA.canComplete}, message="${valA.message}"`);

  if (
    finA.totalAmount === 27 &&
    finA.advanceRequired === 8 &&
    finA.totalPaid === 0 &&
    finA.paymentPercentage === 0 &&
    finA.isAdvancePaid === false &&
    valA.canComplete === false &&
    valA.reason === "advance_unpaid" &&
    valA.message === "Cannot complete order. The required 30% advance payment has not been received." &&
    !valA.message.includes("70%") &&
    !valA.message.includes("Remaining balance")
  ) {
    console.log("✓ PASS: Case A validated successfully (Advance required = ₹8, 0% paid, Complete blocked with Advance Unpaid message).\n");
  } else {
    throw new Error(`Test A Failed: ${JSON.stringify(valA)}`);
  }

  // --- TEST B: ₹27 order, ₹8 advance paid ---
  console.log("--- TEST B: ₹27 Order, ₹8 Advance Paid ---");
  const orderB = {
    totalAmount: 27,
    amountPaid: 8,
    paymentStatus: "partially_paid",
    payments: [
      {
        razorpayPaymentId: "pay_adv_001",
        amount: 8,
        status: "captured",
        method: "razorpay",
      },
    ],
  };
  const finB = calculateOrderFinancials(orderB);
  const valB = validateOrderCompletion(orderB);

  console.log(`Financials B: total=${finB.totalAmount}, advancePaid=${finB.advancePaid}, remaining=${finB.remainingBalance}, isAdvancePaid=${finB.isAdvancePaid}, percent=${finB.paymentPercentage}%`);
  console.log(`Validation B: canComplete=${valB.canComplete}, message="${valB.message}"`);

  if (
    finB.totalAmount === 27 &&
    finB.advanceRequired === 8 &&
    finB.advancePaid === 8 &&
    finB.remainingBalance === 19 &&
    finB.isAdvancePaid === true &&
    finB.isFullyPaid === false &&
    valB.canComplete === false &&
    valB.reason === "balance_unpaid" &&
    valB.message === "30% advance received. Remaining balance of ₹19 is still unpaid."
  ) {
    console.log("✓ PASS: Case B validated successfully (Advance paid = ₹8, Remaining balance = ₹19, Complete blocked with Remaining Balance message).\n");
  } else {
    throw new Error(`Test B Failed: ${JSON.stringify(valB)}`);
  }

  // --- TEST C: ₹27 order, ₹27 fully paid ---
  console.log("--- TEST C: ₹27 Order, ₹27 Fully Paid ---");
  const orderC = {
    totalAmount: 27,
    amountPaid: 27,
    paymentStatus: "paid",
    payments: [
      { razorpayPaymentId: "pay_adv_001", amount: 8, status: "captured" },
      { razorpayPaymentId: "pay_bal_002", amount: 19, status: "captured" },
    ],
  };
  const finC = calculateOrderFinancials(orderC);
  const valC = validateOrderCompletion(orderC);

  console.log(`Financials C: total=${finC.totalAmount}, totalPaid=${finC.totalPaid}, remaining=${finC.remainingBalance}, isFullyPaid=${finC.isFullyPaid}`);
  console.log(`Validation C: canComplete=${valC.canComplete}`);

  if (
    finC.totalAmount === 27 &&
    finC.totalPaid === 27 &&
    finC.remainingBalance === 0 &&
    finC.isFullyPaid === true &&
    valC.canComplete === true &&
    valC.message === null
  ) {
    console.log("✓ PASS: Case C validated successfully (100% paid, ₹0 remaining, Complete allowed).\n");
  } else {
    throw new Error(`Test C Failed: ${JSON.stringify(valC)}`);
  }

  // --- TEST D: Duplicate transaction / payment ID ---
  console.log("--- TEST D: Idempotency with Duplicate Payment ID ---");
  const orderD = {
    totalAmount: 100,
    payments: [
      { razorpayPaymentId: "pay_dup_999", amount: 30, status: "captured" },
      { razorpayPaymentId: "pay_dup_999", amount: 30, status: "captured" }, // Duplicate webhook/event
    ],
  };
  const finD = calculateOrderFinancials(orderD);

  console.log(`Financials D: totalPaid=${finD.totalPaid} (Expected: 30)`);
  if (finD.totalPaid === 30) {
    console.log("✓ PASS: Duplicate transaction ID deduplicated and counted only once.\n");
  } else {
    throw new Error(`Test D Failed: totalPaid was ${finD.totalPaid}, expected 30`);
  }

  // --- TEST E: Failed / Pending Razorpay Payment ---
  console.log("--- TEST E: Failed / Pending Payments Excluded ---");
  const orderE = {
    totalAmount: 100,
    payments: [
      { razorpayPaymentId: "pay_fail_001", amount: 30, status: "failed" },
      { razorpayPaymentId: "pay_pending_002", amount: 30, status: "created" },
      { razorpayPaymentId: "pay_success_003", amount: 30, status: "captured" },
    ],
  };
  const finE = calculateOrderFinancials(orderE);

  console.log(`Financials E: totalPaid=${finE.totalPaid} (Expected: 30)`);
  if (finE.totalPaid === 30) {
    console.log("✓ PASS: Only captured/successful payments counted in totalPaid.\n");
  } else {
    throw new Error(`Test E Failed: totalPaid was ${finE.totalPaid}, expected 30`);
  }

  // --- TEST F: Database Shopping Order Model & Controller Execution ---
  console.log("--- TEST F: Database Shopping Order Lifecycle ---");
  const dbOrder = await Order.create({
    orderId: generateOrderId("SHOP-"),
    user: customer._id,
    items: [{ name: "Handcrafted Saree", price: 27, quantity: 1 }],
    subtotal: 27,
    totalAmount: 27,
    total: 27,
    paymentMethod: "cod",
    paymentStatus: "pending",
    amountPaid: 0,
    status: "placed",
  });

  const check1 = validateOrderCompletion(dbOrder);
  if (check1.canComplete !== false || check1.reason !== "advance_unpaid") {
    throw new Error("DB Order initial validation failed");
  }

  // Record 30% advance
  dbOrder.payments.push({
    razorpayPaymentId: "pay_db_adv_1",
    amount: 8,
    status: "captured",
    method: "razorpay",
  });
  dbOrder.amountPaid = 8;
  dbOrder.paymentStatus = "partially_paid";
  await dbOrder.save();

  const check2 = validateOrderCompletion(dbOrder);
  if (check2.canComplete !== false || check2.reason !== "balance_unpaid") {
    throw new Error("DB Order advance validation failed");
  }

  // Record remaining balance
  dbOrder.payments.push({
    razorpayPaymentId: "pay_db_bal_2",
    amount: 19,
    status: "captured",
    method: "razorpay",
  });
  dbOrder.amountPaid = 27;
  dbOrder.paymentStatus = "paid";
  await dbOrder.save();

  const check3 = validateOrderCompletion(dbOrder);
  if (check3.canComplete !== true) {
    throw new Error("DB Order full payment validation failed");
  }

  console.log("✓ PASS: Database Order Lifecycle verified with exact state transitions.\n");
  await Order.findByIdAndDelete(dbOrder._id);

  console.log("================================================================================");
  console.log("ALL PAYMENT VALIDATION & COMPLETE ORDER TESTS PASSED! 🎉");
  console.log("================================================================================");

  await mongoose.disconnect();
}

runPaymentValidationTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
