const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const xssSanitize = require("./middleware/xssSanitize");
const path = require("path");

const { apiLimiter } = require("./middleware/rateLimiter");
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const designRoutes = require("./routes/designRoutes");
const cartRoutes = require("./routes/cartRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const orderRoutes = require("./routes/orderRoutes");
const tailoringRoutes = require("./routes/tailoringRoutes");
const priorityRoutes = require("./routes/priorityRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const contactRoutes = require("./routes/contactRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const adminRoutes = require("./routes/adminRoutes");
const settingsRoutes = require("./routes/settingsRoutes");

const app = express();

// Trust reverse proxy (e.g. Render, Heroku) for rate limiting & IP detection
app.set("trust proxy", 1);

// --- Security & core middleware ---
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Build allowlist from env vars (comma-separated) + always allow localhost dev
      const allowed = new Set([
        "http://localhost:5173",
        "http://localhost:3000",
        ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
        ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim()) : []),
      ]);
      // Allow server-to-server requests (no Origin header) and listed origins
      if (!origin || allowed.has(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xssSanitize);
app.use(compression());

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

app.use("/api", apiLimiter);

// Serve locally-stored uploads (used automatically whenever Cloudinary
// credentials aren't configured — see config/cloudinary.js).
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// --- Health check ---
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "Lucky Couture API is running", timestamp: new Date().toISOString() });
});

// --- API routes ---
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/designs", designRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/tailoring", tailoringRoutes);
app.use("/api/priority-stitching", priorityRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/settings", settingsRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
