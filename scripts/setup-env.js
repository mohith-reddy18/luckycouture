const fs = require("fs");
const path = require("path");

const examplePath = path.join(__dirname, "..", "backend", ".env.example");
const envPath = path.join(__dirname, "..", "backend", ".env");

if (fs.existsSync(envPath)) {
  console.log("backend/.env already exists — leaving it as is.");
  process.exit(0);
}

if (!fs.existsSync(examplePath)) {
  console.error("backend/.env.example not found — nothing to copy.");
  process.exit(1);
}

fs.copyFileSync(examplePath, envPath);
console.log(
  "Created backend/.env from backend/.env.example.\n" +
    "  → Open backend/.env and set MONGO_URI (and JWT_SECRET) before running `npm run dev`.\n"
);
