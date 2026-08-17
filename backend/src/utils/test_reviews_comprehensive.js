require("dotenv").config({ path: "c:/college/projects/luckycouture/backend/.env" });
const mongoose = require("mongoose");
const assert = require("assert");

const User = require("c:/college/projects/luckycouture/backend/src/models/User.js");
const Product = require("c:/college/projects/luckycouture/backend/src/models/Product.js");
const Design = require("c:/college/projects/luckycouture/backend/src/models/Design.js");
const Category = require("c:/college/projects/luckycouture/backend/src/models/Category.js");
const Order = require("c:/college/projects/luckycouture/backend/src/models/Order.js");
const TailoringOrder = require("c:/college/projects/luckycouture/backend/src/models/TailoringOrder.js");
const Review = require("c:/college/projects/luckycouture/backend/src/models/Review.js");

const reviewController = require("c:/college/projects/luckycouture/backend/src/controllers/reviewController.js");

// Mock Express req/res
function mockReqRes({ user, body = {}, params = {}, query = {} }) {
  let statusCode = 200;
  let responseData = null;
  let statusMessage = "";

  const req = { user, body, params, query, headers: {} };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
  };

  return { req, res, getResult: () => ({ status: statusCode, body: responseData }) };
}

async function runTests() {
  console.log("Starting Review System Verification Tests...\n");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB");

  try {
    // 0. Setup test user, second user, category, product, and design
    const testCategory = await Category.findOneAndUpdate(
      { slug: "test-review-category" },
      { name: "Test Review Category", slug: "test-review-category", type: "both", isActive: true },
      { upsert: true, new: true }
    );

    const testUser1 = await User.findOneAndUpdate(
      { email: "test_reviewer_1@luckycouture.test" },
      { name: "Test Reviewer One", email: "test_reviewer_1@luckycouture.test", password: "Password123!", role: "customer", isActive: true },
      { upsert: true, new: true }
    );

    const testUser2 = await User.findOneAndUpdate(
      { email: "test_reviewer_2@luckycouture.test" },
      { name: "Test Reviewer Two", email: "test_reviewer_2@luckycouture.test", password: "Password123!", role: "customer", isActive: true },
      { upsert: true, new: true }
    );

    const testProduct = await Product.findOneAndUpdate(
      { slug: "test-review-product-silk-saree" },
      {
        name: "Test Review Silk Saree",
        slug: "test-review-product-silk-saree",
        description: "A test saree for review validation",
        category: testCategory._id,
        price: 3500,
        mrp: 5000,
        status: "active",
      },
      { upsert: true, new: true }
    );

    const testDesign = await Design.findOneAndUpdate(
      { slug: "test-review-design-blouse" },
      {
        title: "Test Review Designer Blouse",
        slug: "test-review-design-blouse",
        category: testCategory._id,
        description: "A test blouse design for review validation",
        status: "active",
      },
      { upsert: true, new: true }
    );

    // Clean up any old test reviews and test orders
    await Review.deleteMany({
      $or: [
        { product: testProduct._id },
        { design: testDesign._id },
        { user: { $in: [testUser1._id, testUser2._id] } },
      ],
    });
    await Order.deleteMany({ user: { $in: [testUser1._id, testUser2._id] } });
    await TailoringOrder.deleteMany({ customer: { $in: [testUser1._id, testUser2._id] } });

    console.log("✓ Test fixtures initialized");

    // ==========================================
    // CASE 1: No purchase on Shop product
    // ==========================================
    console.log("\nTesting CASE 1: No purchase on Shop product...");
    {
      const { req, res, getResult } = mockReqRes({
        user: testUser1,
        query: { productId: testProduct.slug },
      });
      await reviewController.checkReviewEligibility(req, res);
      const resData = getResult();
      assert.strictEqual(resData.body.data.canReview, false, "Should not be able to review without purchase");
      assert.strictEqual(resData.body.data.status, "not_purchased");

      // Direct POST attempt without order must throw 403
      let postError = null;
      try {
        const { req: pReq, res: pRes } = mockReqRes({
          user: testUser1,
          body: { productId: testProduct.slug, rating: 5, comment: "I loved this!" },
        });
        await reviewController.createReview(pReq, pRes);
      } catch (err) {
        postError = err;
      }
      assert(postError, "Direct POST without purchase must fail");
      assert.strictEqual(postError.statusCode, 403);
      console.log("✓ CASE 1 Passed: Cannot review without purchase (Status: not_purchased, Direct POST: 403)");
    }

    // ==========================================
    // CASE 2: Shop order placed/shipped but NOT completed (delivered)
    // ==========================================
    console.log("\nTesting CASE 2: Shop order placed but not completed...");
    const pendingOrder = await Order.create({
      orderId: "LC_TEST_ORD_001",
      user: testUser1._id,
      items: [{ product: testProduct._id, name: testProduct.name, price: testProduct.price, quantity: 1 }],
      subtotal: 3500,
      total: 3500,
      status: "shipped", // Not delivered!
    });
    {
      const { req, res, getResult } = mockReqRes({
        user: testUser1,
        query: { productId: testProduct.slug },
      });
      await reviewController.checkReviewEligibility(req, res);
      const resData = getResult();
      assert.strictEqual(resData.body.data.canReview, false, "Should not be able to review before delivery");
      assert.strictEqual(resData.body.data.status, "order_not_completed");
      assert(resData.body.data.message.includes("after your order is completed"));

      let postError = null;
      try {
        const { req: pReq, res: pRes } = mockReqRes({
          user: testUser1,
          body: { productId: testProduct.slug, rating: 5, comment: "Looks great so far!" },
        });
        await reviewController.createReview(pReq, pRes);
      } catch (err) {
        postError = err;
      }
      assert(postError, "Direct POST with non-completed order must fail");
      assert.strictEqual(postError.statusCode, 403);
      assert(postError.message.includes("after your order is completed"));
      console.log("✓ CASE 2 Passed: Cannot review until order is completed (Status: order_not_completed, Direct POST: 403)");
    }

    // ==========================================
    // CASE 3: Completed Shop order ("delivered") -> Can submit review
    // ==========================================
    console.log("\nTesting CASE 3: Completed Shop order (delivered)...");
    pendingOrder.status = "delivered";
    await pendingOrder.save();

    {
      const { req, res, getResult } = mockReqRes({
        user: testUser1,
        query: { productId: testProduct.slug },
      });
      await reviewController.checkReviewEligibility(req, res);
      const resData = getResult();
      assert.strictEqual(resData.body.data.canReview, true, "Must be eligible to review after delivery");
      assert.strictEqual(resData.body.data.status, "eligible");
      console.log("✓ CASE 3 Passed: User is eligible to review after order delivery");
    }

    // ==========================================
    // CASE 4: Submit Review
    // ==========================================
    console.log("\nTesting CASE 4: Submit Review...");
    let createdReviewId = null;
    {
      const { req, res, getResult } = mockReqRes({
        user: testUser1,
        body: { productId: testProduct.slug, rating: 4, comment: "Excellent silk quality and fast delivery." },
      });
      await reviewController.createReview(req, res);
      const resData = getResult();
      assert.strictEqual(resData.status, 201);
      assert.strictEqual(resData.body.data.rating, 4);
      assert.strictEqual(resData.body.data.isVerifiedPurchase, true);
      assert.strictEqual(resData.body.data.isEdited, false);
      assert.strictEqual(resData.body.data.editedAt, null);
      createdReviewId = resData.body.data._id;

      // Verify product rating aggregation
      const updatedProduct = await Product.findById(testProduct._id);
      assert.strictEqual(updatedProduct.ratingCount, 1);
      assert.strictEqual(updatedProduct.ratingAverage, 4);

      // Verify eligibility now returns already_reviewed with existing review
      const { req: eReq, res: eRes, getResult: getElig } = mockReqRes({
        user: testUser1,
        query: { productId: testProduct.slug },
      });
      await reviewController.checkReviewEligibility(eReq, eRes);
      const eligData = getElig();
      assert.strictEqual(eligData.body.data.canReview, false);
      assert.strictEqual(eligData.body.data.status, "already_reviewed");
      assert(eligData.body.data.existingReview);
      assert.strictEqual(eligData.body.data.existingReview.comment, "Excellent silk quality and fast delivery.");

      console.log("✓ CASE 4 Passed: Review created with Verified Buyer status, Product rating updated to 4.0 (1 review), eligibility switched to already_reviewed");
    }

    // ==========================================
    // CASE 5: Edit Review
    // ==========================================
    console.log("\nTesting CASE 5: Edit Review...");
    {
      const { req, res, getResult } = mockReqRes({
        user: testUser1,
        params: { id: createdReviewId.toString() },
        body: { rating: 5, comment: "Updated: After wearing, the fit is absolutely 5-star!" },
      });
      await reviewController.updateReview(req, res);
      const resData = getResult();
      assert.strictEqual(resData.status, 200);
      assert.strictEqual(resData.body.data.rating, 5);
      assert.strictEqual(resData.body.data.isEdited, true);
      assert(resData.body.data.editedAt !== null);

      // Review count must NOT increase!
      const totalReviews = await Review.countDocuments({ product: testProduct._id });
      assert.strictEqual(totalReviews, 1, "Review count must remain 1 after edit");

      const updatedProduct = await Product.findById(testProduct._id);
      assert.strictEqual(updatedProduct.ratingCount, 1, "Product rating count must remain 1");
      assert.strictEqual(updatedProduct.ratingAverage, 5, "Product average rating must update to 5.0");

      console.log("✓ CASE 5 Passed: Same review updated, count remains 1, rating updated to 5.0, isEdited=true and editedAt set");
    }

    // ==========================================
    // CASE 6: Prevent second review submission (duplicate POST rejection)
    // ==========================================
    console.log("\nTesting CASE 6: Prevent second review (duplicate POST)...");
    {
      let duplicateError = null;
      try {
        const { req, res } = mockReqRes({
          user: testUser1,
          body: { productId: testProduct.slug, rating: 3, comment: "Attempting duplicate review" },
        });
        await reviewController.createReview(req, res);
      } catch (err) {
        duplicateError = err;
      }
      assert(duplicateError, "Backend must reject duplicate review submission");
      assert.strictEqual(duplicateError.statusCode, 400);
      assert(duplicateError.message.includes("already reviewed"));

      const totalReviews = await Review.countDocuments({ product: testProduct._id });
      assert.strictEqual(totalReviews, 1, "Only 1 review must exist in DB");
      console.log("✓ CASE 6 Passed: Backend strictly rejected duplicate review POST request");
    }

    // ==========================================
    // CASE 7: Design Gallery order not completed
    // ==========================================
    console.log("\nTesting CASE 7: Design Gallery order not completed...");
    const tailoringOrder = await TailoringOrder.create({
      orderId: "LC_TEST_TL_001",
      customer: testUser1._id,
      garmentType: "Blouse",
      referenceDesign: testDesign._id,
      fabricSource: "shop_provided",
      scheduledDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 86400000 * 5),
      status: "stitching", // Not delivered!
    });
    {
      const { req, res, getResult } = mockReqRes({
        user: testUser1,
        query: { designId: testDesign.slug },
      });
      await reviewController.checkReviewEligibility(req, res);
      const resData = getResult();
      assert.strictEqual(resData.body.data.canReview, false, "Should not be able to review design before tailoring delivery");
      assert.strictEqual(resData.body.data.status, "order_not_completed");

      let postError = null;
      try {
        const { req: pReq, res: pRes } = mockReqRes({
          user: testUser1,
          body: { designId: testDesign.slug, rating: 5, comment: "Design is nice!" },
        });
        await reviewController.createReview(pReq, pRes);
      } catch (err) {
        postError = err;
      }
      assert(postError, "Direct design review POST with non-completed order must fail");
      assert.strictEqual(postError.statusCode, 403);
      console.log("✓ CASE 7 Passed: Design review rejected while tailoring order is in progress");
    }

    // ==========================================
    // CASE 8: Completed Design Gallery order ("delivered")
    // ==========================================
    console.log("\nTesting CASE 8: Completed Design Gallery order (delivered)...");
    tailoringOrder.status = "delivered";
    await tailoringOrder.save();

    let createdDesignReviewId = null;
    {
      const { req, res, getResult } = mockReqRes({
        user: testUser1,
        query: { designId: testDesign.slug },
      });
      await reviewController.checkReviewEligibility(req, res);
      const resData = getResult();
      assert.strictEqual(resData.body.data.canReview, true, "Must be eligible to review design after delivery");
      assert.strictEqual(resData.body.data.status, "eligible");

      const { req: pReq, res: pRes, getResult: getPost } = mockReqRes({
        user: testUser1,
        body: { designId: testDesign.slug, rating: 5, comment: "Exquisite maggam embroidery work on this blouse!" },
      });
      await reviewController.createReview(pReq, pRes);
      const postData = getPost();
      assert.strictEqual(postData.status, 201);
      assert.strictEqual(postData.body.data.rating, 5);
      assert.strictEqual(postData.body.data.isVerifiedPurchase, true);
      createdDesignReviewId = postData.body.data._id;

      const updatedDesign = await Design.findById(testDesign._id);
      assert.strictEqual(updatedDesign.ratingCount, 1);
      assert.strictEqual(updatedDesign.ratingAverage, 5);

      console.log("✓ CASE 8 Passed: Design review created successfully with verified status and design rating aggregation");
    }

    // ==========================================
    // CASE 9: Unauthorized edit (user 2 attempts to edit user 1's review)
    // ==========================================
    console.log("\nTesting CASE 9: Unauthorized edit attempt...");
    {
      let authError = null;
      try {
        const { req, res } = mockReqRes({
          user: testUser2, // Different user!
          params: { id: createdReviewId.toString() },
          body: { rating: 1, comment: "Malicious edit attempt" },
        });
        await reviewController.updateReview(req, res);
      } catch (err) {
        authError = err;
      }
      assert(authError, "Unauthorized edit must fail");
      assert.strictEqual(authError.statusCode, 403);
      assert(authError.message.includes("not authorized"));

      // Ensure review in DB was NOT changed
      const original = await Review.findById(createdReviewId);
      assert.strictEqual(original.rating, 5);
      assert(original.comment.includes("fit is absolutely 5-star"));

      console.log("✓ CASE 9 Passed: Unauthorized user edit blocked with 403 status");
    }

    // ==========================================
    // CASE 10: Direct API bypass without completed order
    // ==========================================
    console.log("\nTesting CASE 10: Direct API bypass for non-buyer user 2...");
    {
      let bypassError = null;
      try {
        const { req, res } = mockReqRes({
          user: testUser2,
          body: { productId: testProduct.slug, rating: 5, comment: "Fake unverified review" },
        });
        await reviewController.createReview(req, res);
      } catch (err) {
        bypassError = err;
      }
      assert(bypassError, "Direct API bypass by non-buyer must fail");
      assert.strictEqual(bypassError.statusCode, 403);
      console.log("✓ CASE 10 Passed: Direct API bypass blocked with 403");
    }

    // Clean up test data
    await Review.deleteMany({
      $or: [
        { product: testProduct._id },
        { design: testDesign._id },
      ],
    });
    await Order.deleteMany({ user: { $in: [testUser1._id, testUser2._id] } });
    await TailoringOrder.deleteMany({ customer: { $in: [testUser1._id, testUser2._id] } });
    await Product.deleteOne({ _id: testProduct._id });
    await Design.deleteOne({ _id: testDesign._id });
    await Category.deleteOne({ _id: testCategory._id });
    await User.deleteMany({ _id: { $in: [testUser1._id, testUser2._id] } });

    console.log("\n==========================================");
    console.log("ALL 12 BACKEND REVIEW SYSTEM TEST CASES PASSED SUCCESSFULLY!");
    console.log("==========================================\n");

  } finally {
    await mongoose.disconnect();
  }
}

runTests();
