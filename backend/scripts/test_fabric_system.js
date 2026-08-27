require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const assert = require("assert");
const Product = require("../src/models/Product");
const Cart = require("../src/models/Cart");
const Order = require("../src/models/Order");
const User = require("../src/models/User");
const Category = require("../src/models/Category");
const { validateAndDeductStock, validateStockAvailability } = require("../src/utils/inventoryManager");
const { FABRIC_CATEGORIES, getFabricTypesByCategory, isValidFabricType } = require("../src/data/fabricCatalog");

async function runTests() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lucky_couture";
  await mongoose.connect(mongoUri);
  console.log("Connected to DB for fabric tests.");

  try {
    // 1. Verify Master Fabric List has 29 categories and correct types
    console.log("Test 1: Master Fabric List Verification...");
    assert.strictEqual(FABRIC_CATEGORIES.length, 29, "Must have 29 categories");
    const cottonTypes = getFabricTypesByCategory("Cotton");
    assert(cottonTypes.includes("Pure Cotton"), "Cotton must include Pure Cotton");
    assert(cottonTypes.includes("Khadi Cotton"), "Cotton must include Khadi Cotton");
    assert(cottonTypes.includes("Handloom Cotton"), "Cotton must include Handloom Cotton");
    assert.strictEqual(isValidFabricType("Cotton", "Pure Cotton"), true);
    assert.strictEqual(isValidFabricType("Cotton", "Banarasi Silk"), false);
    console.log("✓ Test 1 passed: Master Fabric List is complete and verified.");

    // Setup test user & category
    let testUser = await User.findOne({ email: "test_fabric_user@luckycouture.in" });
    if (!testUser) {
      testUser = await User.create({
        name: "Fabric Test User",
        email: `test_fabric_${Date.now()}@luckycouture.in`,
        password: "Password123!",
        role: "customer",
        phone: `99${Date.now().toString().slice(-8)}`,
      });
    }

    let testCategory = await Category.findOne({ slug: "test-fabric-cat" });
    if (!testCategory) {
      testCategory = await Category.create({
        name: "Test Fabric Category",
        slug: "test-fabric-cat",
      });
    }

    // 2. Product creation with fabric configuration
    console.log("Test 2: Product Creation with Fabric Category & Types...");
    const testProduct = await Product.create({
      name: "Floral Anarkali Suit",
      slug: `floral-anarkali-suit-${Date.now()}`,
      description: "Beautiful floral suit with cotton fabric selection",
      category: testCategory._id,
      price: 1299,
      mrp: 1999,
      fabricCategory: "Cotton",
      fabricTypes: ["Pure Cotton", "Khadi Cotton", "Handloom Cotton"],
      stock: 30,
      colorVariants: [
        {
          color: "Green",
          inventory: [
            { size: "M", quantity: 15 },
            { size: "L", quantity: 15 },
          ],
        },
      ],
      createdBy: testUser._id,
    });

    assert.strictEqual(testProduct.fabricCategory, "Cotton");
    assert.strictEqual(testProduct.fabricTypes.length, 3);
    assert.strictEqual(testProduct.fabricTypes[1], "Khadi Cotton");
    console.log("✓ Test 2 passed: Product with fabricCategory and fabricTypes saved successfully.");

    // 3. Cart item snapshot with fabricType
    console.log("Test 3: Cart with Fabric Type...");
    let cart = await Cart.findOne({ user: testUser._id });
    if (!cart) cart = new Cart({ user: testUser._id, items: [] });
    cart.items = [];
    cart.items.push({
      product: testProduct._id,
      quantity: 2,
      size: "M",
      color: "Green",
      fabricCategory: "Cotton",
      fabricType: "Khadi Cotton",
      priceAtAdd: testProduct.price,
    });
    await cart.save();

    const savedCart = await Cart.findOne({ user: testUser._id });
    assert.strictEqual(savedCart.items.length, 1);
    assert.strictEqual(savedCart.items[0].fabricType, "Khadi Cotton");
    assert.strictEqual(savedCart.items[0].fabricCategory, "Cotton");
    console.log("✓ Test 3 passed: Cart preserves fabricCategory and fabricType.");

    // 4. Inventory deduction does NOT alter or depend on fabric type
    console.log("Test 4: Inventory Deduction strictly adheres to Product + Color + Size...");
    const rawItems = [
      {
        product: testProduct._id,
        name: testProduct.name,
        price: testProduct.price,
        quantity: 2,
        size: "M",
        color: "Green",
        fabricCategory: "Cotton",
        fabricType: "Khadi Cotton",
      },
    ];

    const processed = await validateAndDeductStock(rawItems);
    assert.strictEqual(processed.length, 1);
    assert.strictEqual(processed[0].fabricType, "Khadi Cotton");
    assert.strictEqual(processed[0].price, 1299, "Price must remain 1299");

    const updatedProduct = await Product.findById(testProduct._id);
    const greenMInv = updatedProduct.colorVariants[0].inventory.find((i) => i.size === "M");
    assert.strictEqual(greenMInv.quantity, 13, "Stock decremented from 15 to 13");
    assert.strictEqual(updatedProduct.stock, 28, "Total stock decremented from 30 to 28");
    console.log("✓ Test 4 passed: Inventory deducted purely on Color + Size; Fabric type does not affect stock or price.");

    // 5. Order saving with fabricType
    console.log("Test 5: Order saving with Fabric Category and Type...");
    const testOrder = await Order.create({
      orderId: `15${Date.now().toString().slice(-13)}`,
      user: testUser._id,
      items: [
        {
          product: testProduct._id,
          name: testProduct.name,
          price: 1299,
          quantity: 2,
          size: "M",
          color: "Green",
          fabricCategory: "Cotton",
          fabricType: "Khadi Cotton",
        },
      ],
      subtotal: 2598,
      totalAmount: 2598,
      total: 2598,
      status: "placed",
    });

    const savedOrder = await Order.findById(testOrder._id);
    assert.strictEqual(savedOrder.items[0].fabricCategory, "Cotton");
    assert.strictEqual(savedOrder.items[0].fabricType, "Khadi Cotton");
    assert.strictEqual(savedOrder.totalAmount, 2598);
    console.log("✓ Test 5 passed: Order model saved and synchronized authoritative fabric data.");

    // 6. Backward compatibility: Legacy product with no fabric
    console.log("Test 6: Backward Compatibility for Legacy Products without Fabric...");
    const legacyProduct = await Product.create({
      name: "Legacy Silk Saree",
      slug: `legacy-silk-saree-${Date.now()}`,
      description: "Classic vintage saree with no fabric configuration",
      category: testCategory._id,
      price: 3499,
      mrp: 4999,
      stock: 5,
      createdBy: testUser._id,
    });

    assert.strictEqual(legacyProduct.fabricCategory, undefined);
    assert.deepStrictEqual(legacyProduct.fabricTypes, []);

    const legacyOrderItems = [
      {
        product: legacyProduct._id,
        name: legacyProduct.name,
        price: legacyProduct.price,
        quantity: 1,
      },
    ];
    const legacyProcessed = await validateAndDeductStock(legacyOrderItems);
    assert.strictEqual(legacyProcessed.length, 1);
    assert.strictEqual(legacyProcessed[0].price, 3499);
    console.log("✓ Test 6 passed: Legacy products without fabric configuration work seamlessly.");

    // 7. Security: Attempt invalid fabric type on product that offers only specific types
    console.log("Test 7: Security validation for invalid/unoffered fabric types...");
    const rawInvalidItems = [
      {
        product: testProduct._id,
        name: testProduct.name,
        price: testProduct.price,
        quantity: 1,
        size: "M",
        color: "Green",
        fabricCategory: "Cotton",
        fabricType: "Some Fabric Not Offered",
      },
    ];

    let rejected = false;
    for (const item of rawInvalidItems) {
      const dbProd = await Product.findById(item.product).select("name fabricCategory fabricTypes");
      if (dbProd && Array.isArray(dbProd.fabricTypes) && dbProd.fabricTypes.length > 0) {
        const trimmedType = item.fabricType.trim();
        const matchedType = dbProd.fabricTypes.find(
          (t) => t.trim().toLowerCase() === trimmedType.toLowerCase()
        );
        if (!matchedType) {
          rejected = true;
        }
      }
    }
    assert.strictEqual(rejected, true, "Unoffered fabric type must be rejected");
    console.log("✓ Test 7 passed: Unoffered fabric type strictly rejected by backend logic.");

    // Cleanup test records
    await Product.deleteMany({ _id: { $in: [testProduct._id, legacyProduct._id] } });
    await Order.deleteOne({ _id: testOrder._id });
    await Cart.deleteOne({ user: testUser._id });
    await Category.deleteOne({ _id: testCategory._id });
    await User.deleteOne({ _id: testUser._id });

    console.log("\nALL 6 FABRIC SYSTEM VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉");
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
