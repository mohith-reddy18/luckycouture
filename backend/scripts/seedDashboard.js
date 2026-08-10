require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Order = require("../src/models/Order");
const TailoringOrder = require("../src/models/TailoringOrder");

async function seedDashboard() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { family: 4 });
    console.log("Connected to MongoDB");

    // 1. Create a dummy customer
    let customer = await User.findOne({ email: "customer@example.com" });
    if (!customer) {
      customer = await User.create({
        name: "Test Customer",
        email: "customer@example.com",
        password: "password123",
        role: "customer",
      });
      console.log("Created test customer");
    }

    // 2. Insert some Orders
    const orderCount = await Order.countDocuments();
    if (orderCount === 0) {
      await Order.insertMany([
        {
          orderId: "ORD123456789012",
          user: customer._id,
          subtotal: 5000,
          total: 5000,
          status: "placed",
          items: [
            { name: "Test Product 1", price: 2500, quantity: 2 }
          ]
        },
        {
          orderId: "ORD987654321098",
          user: customer._id,
          subtotal: 12000,
          total: 12000,
          status: "confirmed",
          items: [
            { name: "Test Product 2", price: 12000, quantity: 1 }
          ]
        }
      ]);
      console.log("Created test shopping orders");
    }

    // 3. Insert some Tailoring Orders
    const tailoringCount = await TailoringOrder.countDocuments();
    if (tailoringCount === 0) {
      await TailoringOrder.insertMany([
        {
          garmentType: "Lehenga",
          fabricSource: "shop_provided",
          designComplexity: "heavy",
          isFastDelivery: true,
          status: "pending",
          guestInfo: { name: "Guest User", phone: "9876543210" }
        },
        {
          garmentType: "Blouse",
          fabricSource: "customer_provided",
          designComplexity: "simple",
          isFastDelivery: false,
          status: "in_stitching",
          customer: customer._id
        }
      ]);
      console.log("Created test tailoring orders");
    }

    console.log("Dashboard seeding complete! Check your admin panel.");
  } catch (err) {
    console.error("Error seeding dashboard:", err);
  } finally {
    mongoose.disconnect();
  }
}

seedDashboard();
