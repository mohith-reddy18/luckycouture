require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const Category = require("../models/Category");
const Product = require("../models/Product");
const Design = require("../models/Design");
const AdminSetting = require("../models/AdminSetting");
const { slugify } = require("../controllers/categoryController");

const shopCategories = [
  { name: "Wedding", type: "both" },
  { name: "Sarees", type: "shop" },
  { name: "Dresses", type: "shop" },
  { name: "Nighties", type: "shop" },
  { name: "Women", type: "design" },
  { name: "School", type: "design" },
  { name: "Customised", type: "design" },
];

async function run() {
  await connectDB();
  console.log("Seeding Lucky Couture database...");

  // --- Admin user ---
  const adminEmail = process.env.ADMIN_EMAIL || "admin@luckycouture.in";
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      name: process.env.ADMIN_NAME || "Lucky Couture Admin",
      email: adminEmail,
      password: process.env.ADMIN_PASSWORD || "change_this_password",
      role: "admin",
      isEmailVerified: true,
    });
    console.log(`Created admin user: ${adminEmail}`);
  } else {
    console.log("Admin user already exists, skipping");
  }

  // --- Categories ---
  const categoryDocs = {};
  for (const cat of shopCategories) {
    let doc = await Category.findOne({ name: cat.name });
    if (!doc) {
      doc = await Category.create({ name: cat.name, slug: slugify(cat.name), type: cat.type });
      console.log(`Created category: ${cat.name}`);
    }
    categoryDocs[cat.name] = doc;
  }

  // --- Sample products ---
  const sampleProducts = [
    { name: "Hand-embroidered Bridal Lehenga", category: "Wedding", price: 8999, mrp: 12999, isBestseller: true, description: "Hand-embroidered bridal lehenga with premium zardozi work." },
    { name: "Kanjeevaram Silk Saree", category: "Sarees", price: 6999, mrp: 9999, isBestseller: true, description: "Traditional handwoven Kanjeevaram silk saree." },
    { name: "Chikankari Anarkali Dress", category: "Dresses", price: 1899, mrp: 2499, description: "Chikankari embroidered anarkali dress, breathable cotton." },
    { name: "Satin Nightie Set", category: "Nighties", price: 799, mrp: 1099, description: "Comfortable satin nightie set for everyday wear." },
  ];

  for (const p of sampleProducts) {
    const exists = await Product.findOne({ name: p.name });
    if (exists) continue;
    await Product.create({
      ...p,
      slug: slugify(`${p.name}-${Date.now()}`),
      category: categoryDocs[p.category]._id,
      stock: 25,
      createdBy: admin._id,
    });
    console.log(`Created product: ${p.name}`);
  }

  // --- Sample designs ---
  const sampleDesigns = [
    { title: "Regal Zardozi Lehenga", category: "Wedding", difficultyLevel: "heavy", description: "Statement bridal lehenga with zardozi embroidery." },
    { title: "Chikankari Kurti", category: "Women", difficultyLevel: "simple", description: "Everyday chikankari kurti, light cotton fabric." },
    { title: "School Pinafore", category: "School", difficultyLevel: "simple", description: "Standard school pinafore, durable stitching." },
  ];

  for (const d of sampleDesigns) {
    const exists = await Design.findOne({ title: d.title });
    if (exists) continue;
    await Design.create({
      ...d,
      slug: slugify(`${d.title}-${Date.now()}`),
      category: categoryDocs[d.category]._id,
      createdBy: admin._id,
      source: "admin",
      status: "active",
    });
    console.log(`Created design: ${d.title}`);
  }

  // --- Admin settings singleton ---
  await AdminSetting.getSingleton();
  console.log("Admin settings initialized");

  console.log("Seeding complete.");
  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
