const { normalizeAdminOrder, matchesSchedule, getNormalizedCategory } = require("../backend/src/utils/orderClassifier");

// Create test order docs of every status
const testDocs = [
  { _id: "1", orderId: "SHOP-1", status: "placed", paymentMethod: "cod", totalAmount: 1000 },
  { _id: "2", orderId: "SHOP-2", status: "confirmed", paymentMethod: "razorpay", paymentStatus: "paid", amountPaid: 1000, totalAmount: 1000 },
  { _id: "3", orderId: "SHOP-3", status: "processing", paymentMethod: "razorpay", paymentStatus: "paid", amountPaid: 1000, totalAmount: 1000 },
  { _id: "4", orderId: "SHOP-4", status: "ready", paymentMethod: "cod", totalAmount: 1000 },
  { _id: "5", orderId: "SHOP-5", status: "dispatched", paymentMethod: "cod", totalAmount: 1000 },
  { _id: "6", orderId: "SHOP-6", status: "delivered", paymentMethod: "cod", totalAmount: 1000 },
  { _id: "7", orderId: "SHOP-7", status: "completed", paymentMethod: "cod", totalAmount: 1000 },
  { _id: "8", orderId: "SHOP-8", status: "cancelled", paymentMethod: "razorpay", paymentStatus: "refunded", amountPaid: 0, totalAmount: 1000 },
  { _id: "9", orderId: "SHOP-9", status: "rejected", paymentMethod: "razorpay", paymentStatus: "refunded", amountPaid: 0, totalAmount: 1000, rejectionReason: "Out of stock" },
];

console.log("=== TESTING ALL ORDERS QUERY FOR ALL STATUSES ===");

const normalizedList = testDocs.map(d => normalizeAdminOrder(d, "shopping"));

let scheduleAllCount = 0;
let schedulePendingCount = 0;

normalizedList.forEach(o => {
  const matchesAll = matchesSchedule(o, "all");
  const matchesPending = matchesSchedule(o, "pending");
  const cat = getNormalizedCategory(o);

  if (matchesAll) scheduleAllCount++;
  if (matchesPending) schedulePendingCount++;

  console.log(`Order ${o.orderId} (Status: "${o.status}"):`);
  console.log(`  - matchesSchedule('all'): ${matchesAll}`);
  console.log(`  - matchesSchedule('pending'): ${matchesPending}`);
  console.log(`  - getNormalizedCategory: "${cat}"`);
});

console.log(`\nTotal Test Orders: ${testDocs.length}`);
console.log(`All Orders Count ('all'): ${scheduleAllCount}`);
console.log(`Pending Orders Count ('pending'): ${schedulePendingCount}`);

if (scheduleAllCount === testDocs.length) {
  console.log("\n✓ PASS: All Orders correctly includes ALL orders (including rejected, cancelled, completed, delivered)!");
} else {
  console.log("\n✗ FAIL: Some orders were excluded from All Orders!");
}
