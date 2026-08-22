const mongoose = require("mongoose");

const settlementSchema = new mongoose.Schema(
  {
    settlementId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true, // Amount in paise
    },
    amountINR: {
      type: Number,
      required: true, // Amount in INR
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      default: "processed",
      index: true,
    },
    utr: {
      type: String,
      index: true,
    },
    fees: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    settledAt: {
      type: Date,
      default: Date.now,
    },
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

settlementSchema.index({ settledAt: -1 });

module.exports = mongoose.model("Settlement", settlementSchema);
