const mongoose = require("mongoose");

const dailyReportLogSchema = new mongoose.Schema(
  {
    // IST date key formatted as YYYY-MM-DD (e.g. "2026-09-13")
    dateKey: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ["success", "failed"], default: "success" },
    sentAt: { type: Date, default: Date.now },
    recipients: [{ type: String }],
    todaysCount: { type: Number, default: 0 },
    overdueCount: { type: Number, default: 0 },
    error: { type: String },
    triggeredBy: { type: String, default: "system_scheduler" }, // "system_scheduler" | "admin_manual"
  },
  { timestamps: true }
);

module.exports = mongoose.model("DailyReportLog", dailyReportLogSchema);
