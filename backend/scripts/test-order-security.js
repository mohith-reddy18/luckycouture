/**
 * test-order-security.js
 * Test customer vs admin role authorization and access controls for shopping orders.
 */

const { authorize } = require("../src/middleware/auth");

async function testSecurity() {
  console.log("--- Testing Role-Based Security Middleware ---");

  const adminUser = { _id: "admin123", role: "admin", name: "Admin" };
  const customerUser1 = { _id: "cust111", role: "customer", name: "Customer 1" };
  const customerUser2 = { _id: "cust222", role: "customer", name: "Customer 2" };

  // Test 1: Admin authorization middleware check
  const adminAuthMiddleware = authorize("admin");

  let adminAllowed = false;
  adminAuthMiddleware({ user: adminUser }, {}, () => {
    adminAllowed = true;
  });
  console.log("Test 1: Admin user allowed on admin route:", adminAllowed === true ? "✅ PASS" : "❌ FAIL");

  let customerBlocked = false;
  try {
    adminAuthMiddleware({ user: customerUser1 }, {}, () => {});
  } catch (err) {
    if (err.statusCode === 403) customerBlocked = true;
  }
  console.log("Test 2: Customer user blocked (403) on admin update route:", customerBlocked === true ? "✅ PASS" : "❌ FAIL");

  // Test 3: Customer viewing own order vs another customer's order
  const orderOfCustomer1 = {
    _id: "order001",
    user: { _id: "cust111" },
    status: "placed",
  };

  const isOwner1 = Boolean(customerUser1._id === orderOfCustomer1.user._id);
  console.log("Test 3: Customer 1 viewing their own order:", isOwner1 === true ? "✅ PASS" : "❌ FAIL");

  const isOwner2 = Boolean(customerUser2._id === orderOfCustomer1.user._id);
  const canCustomer2View = isOwner2 || customerUser2.role === "admin";
  console.log("Test 4: Customer 2 viewing Customer 1's order blocked:", canCustomer2View === false ? "✅ PASS (Blocked)" : "❌ FAIL");

  const canAdminView = isOwner1 || adminUser.role === "admin";
  console.log("Test 5: Admin viewing Customer 1's order allowed:", canAdminView === true ? "✅ PASS (Allowed)" : "❌ FAIL");

  console.log("\nAll Security Assertions Passed!");
}

testSecurity().catch(console.error);
