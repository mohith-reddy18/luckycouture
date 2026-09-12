const Order = require("../models/Order");
const TailoringOrder = require("../models/TailoringOrder");
const PriorityOrder = require("../models/PriorityOrder");
const AdminSetting = require("../models/AdminSetting");
const DailyReportLog = require("../models/DailyReportLog");
const { sendEmail } = require("../utils/mailer");
const { getISTDateBoundaries, isISTToday, isISTOverdue } = require("../utils/adminDateUtils");
const { TERMINAL_STATUSES, normalizeAdminOrder, matchesSchedule } = require("../utils/orderClassifier");

/**
 * Formats a Date into "DD Mon YYYY" (e.g. "13 Sep 2026").
 */
function formatDateShort(dateVal) {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Returns formatted IST Date key (YYYY-MM-DD) for a given date.
 */
function getISTDateKey(refDate = new Date()) {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const ist = new Date(refDate.getTime() + istOffsetMs);
  const year = ist.getUTCFullYear();
  const month = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const day = String(ist.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns human-readable IST date string (e.g. "13 Sep 2026").
 */
function getISTFormattedDate(refDate = new Date()) {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const ist = new Date(refDate.getTime() + istOffsetMs);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${ist.getUTCDate()} ${months[ist.getUTCMonth()]} ${ist.getUTCFullYear()}`;
}

/**
 * Formats order type label.
 */
function getOrderTypeBadge(orderKind) {
  if (orderKind === "shopping") return "Shopping Order";
  if (orderKind === "priority") return "Priority Stitching";
  return "Tailoring Order";
}

/**
 * Generates and sends the daily 10 AM IST Admin Order Report email.
 *
 * @param {Object} options
 * @param {boolean} options.force - If true, bypasses the idempotency check for manual testing.
 * @param {string} options.triggeredBy - "system_scheduler" | "admin_manual"
 */
async function generateAndSendDailyReport({ force = false, triggeredBy = "system_scheduler" } = {}) {
  const dateKey = getISTDateKey();
  const dateDisplay = getISTFormattedDate();

  // 1. Idempotency Guard (unless forced by manual admin trigger)
  if (!force) {
    const existingLog = await DailyReportLog.findOne({ dateKey, status: "success" });
    if (existingLog) {
      console.log(`[DailyReportService] Report already sent today (${dateKey}). Skipping duplicate delivery.`);
      return {
        skipped: true,
        reason: `Daily report for ${dateKey} has already been sent successfully at ${existingLog.sentAt}.`,
        dateKey,
      };
    }
  }

  // 2. Fetch Support Contact Recipients dynamically from AdminSetting singleton
  const settings = await AdminSetting.getSingleton();
  const primarySupport = (settings.contactInfo?.email || "").trim();
  const techSupport = (settings.contactInfo?.techSupportEmail || "").trim();

  const recipientSet = new Set();
  if (techSupport) recipientSet.add(techSupport);
  if (primarySupport) recipientSet.add(primarySupport);

  // Fallbacks if setting is empty
  if (recipientSet.size === 0) {
    recipientSet.add("mohithreddybade18@gmail.com");
    recipientSet.add("lakshmibade32@gmail.com");
  }

  const recipients = Array.from(recipientSet);
  console.log(`[DailyReportService] Generating report for ${dateKey}. Recipients:`, recipients);

  // 3. Query Active Orders from MongoDB
  const unverifiedRazorpayFilter = {
    paymentMethod: "razorpay",
    paymentStatus: "pending",
    amountPaid: 0,
    status: "placed",
    stockDeducted: false,
  };

  const shoppingPendingFilter = {
    status: { $nin: TERMINAL_STATUSES },
    $nor: [unverifiedRazorpayFilter],
  };
  const tailoringPendingFilter = {
    status: { $nin: [...TERMINAL_STATUSES, "pending_payment"] },
    $nor: [{ paymentStatus: "pending", amountPaid: 0 }],
  };
  const priorityPendingFilter = { status: { $nin: TERMINAL_STATUSES } };

  const [shoppingDocs, tailoringDocs, priorityDocs] = await Promise.all([
    Order.find(shoppingPendingFilter).populate("user", "name email phone").lean(),
    TailoringOrder.find(tailoringPendingFilter).populate("customer", "name email phone").lean(),
    PriorityOrder.find(priorityPendingFilter).populate("customer", "name email phone").lean(),
  ]);

  const normalizedShopping = (shoppingDocs || []).map((d) => normalizeAdminOrder(d, "shopping"));
  const normalizedTailoring = (tailoringDocs || []).map((d) => normalizeAdminOrder(d, "tailoring"));
  const normalizedPriority = (priorityDocs || []).map((d) => normalizeAdminOrder(d, "priority"));

  const allActiveOrders = [...normalizedShopping, ...normalizedTailoring, ...normalizedPriority];

  // 4. Categorize Orders into Today's Orders & Overdue Orders
  const { todayStart } = getISTDateBoundaries();
  const todaysOrders = [];
  const overdueOrders = [];
  allActiveOrders.forEach((order) => {
    if (matchesSchedule(order, "today")) {
      todaysOrders.push(order);
    } else if (matchesSchedule(order, "overdue")) {
      const targetDate = order.adminReadyDate || order.targetDeliveryDate;
      const diffMs = todayStart.getTime() - new Date(targetDate).getTime();
      const daysOverdue = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
      overdueOrders.push({
        ...order,
        daysOverdue,
      });
    }
  });

  // Sort overdue orders by highest days overdue first
  overdueOrders.sort((a, b) => b.daysOverdue - a.daysOverdue);

  // 5. Build HTML Email Template
  const emailHtml = buildEmailHtml({
    dateDisplay,
    todaysOrders,
    overdueOrders,
  });

  const emailText = buildEmailText({
    dateDisplay,
    todaysOrders,
    overdueOrders,
  });

  const subject = `Lucky Couture — Today's Orders & Overdue Orders — ${dateDisplay}`;

  // 6. Send Email via Mailer Infrastructure
  try {
    const result = await sendEmail({
      to: recipients,
      subject,
      html: emailHtml,
      text: emailText,
    });

    // 7. Record Idempotency Log in MongoDB
    await DailyReportLog.findOneAndUpdate(
      { dateKey },
      {
        dateKey,
        status: "success",
        sentAt: new Date(),
        recipients,
        todaysCount: todaysOrders.length,
        overdueCount: overdueOrders.length,
        triggeredBy,
        error: undefined,
      },
      { upsert: true, new: true }
    );

    console.log(`[DailyReportService:success] Email delivered to ${recipients.join(", ")} for ${dateKey}. Today: ${todaysOrders.length}, Overdue: ${overdueOrders.length}`);

    return {
      success: true,
      dateKey,
      recipients,
      todaysCount: todaysOrders.length,
      overdueCount: overdueOrders.length,
      messageId: result?.messageId,
    };
  } catch (err) {
    console.error(`[DailyReportService:error] Failed to send report for ${dateKey}:`, err.message);

    await DailyReportLog.findOneAndUpdate(
      { dateKey },
      {
        dateKey,
        status: "failed",
        sentAt: new Date(),
        recipients,
        todaysCount: todaysOrders.length,
        overdueCount: overdueOrders.length,
        triggeredBy,
        error: err.message,
      },
      { upsert: true, new: true }
    ).catch(() => {});

    throw err;
  }
}

/**
 * Builds HTML Email Template for Daily Report
 */
function buildEmailHtml({ dateDisplay, todaysOrders, overdueOrders }) {
  const primaryColor = "#4A2E35";
  const accentColor = "#D4AF37";
  const bgColor = "#FDFBF7";

  const renderOrderCards = (orders, isOverdueList = false) => {
    if (orders.length === 0) {
      return `
        <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; border: 1px border border-[#E8E0D5]; text-align: center; color: #777777; font-size: 13px;">
          ${isOverdueList ? "No overdue orders. All fulfillment schedules are up to date." : "No orders scheduled for ready/dispatch deadline today."}
        </div>
      `;
    }

    return orders
      .map((ord) => {
        const orderIdStr = ord.orderId || ord.displayId || ord._id;
        const customerName = ord.customer?.name || "Customer";
        const customerPhone = ord.customer?.phone && ord.customer.phone !== "-" ? ord.customer.phone : "";
        const customerEmail = ord.customer?.email && ord.customer.email !== "-" ? ord.customer.email : "";
        const contactLine = [customerPhone, customerEmail].filter(Boolean).join(" · ");
        const orderKindLabel = getOrderTypeBadge(ord.orderKind);
        const deadlineText = ord.adminReadyDate ? formatDateShort(ord.adminReadyDate) : "Today";
        const statusText = (ord.status || "placed").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

        return `
          <div style="background-color: #ffffff; margin-bottom: 12px; padding: 16px 20px; border-radius: 12px; border: 1px solid ${isOverdueList ? "#FCA5A5" : "#E8E0D5"}; shadow-sm: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #F3EFE9; padding-bottom: 10px; margin-bottom: 10px;">
              <div>
                <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${primaryColor}; letter-spacing: 0.5px;">${orderKindLabel}</span>
                <h4 style="margin: 2px 0 0 0; font-size: 15px; font-weight: 700; color: #111111;">Order #${orderIdStr}</h4>
              </div>
              <div style="text-align: right;">
                ${isOverdueList
                  ? `<span style="background-color: #FEE2E2; color: #991B1B; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; display: inline-block;">${ord.daysOverdue} ${ord.daysOverdue === 1 ? "day" : "days"} overdue</span>`
                  : `<span style="background-color: #FEF3C7; color: #92400E; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; display: inline-block;">Ready Today</span>`
                }
              </div>
            </div>

            <div style="font-size: 13px; color: #444444; line-height: 1.6;">
              <p style="margin: 0 0 4px 0;"><strong>Customer:</strong> ${customerName} ${contactLine ? `<span style="color: #666; font-size: 12px;">(${contactLine})</span>` : ""}</p>
              <p style="margin: 0 0 4px 0;"><strong>Items / Details:</strong> ${ord.itemsSummary || "Boutique Order"}</p>
              <p style="margin: 0 0 4px 0;"><strong>Ready Deadline:</strong> <span style="color: ${primaryColor}; font-weight: 600;">${deadlineText}</span></p>
              <p style="margin: 0 0 4px 0;"><strong>Current Status:</strong> <span style="background-color: #F3F4F6; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; color: #374151;">${statusText}</span></p>
              <p style="margin: 0;"><strong>Total Value:</strong> ₹${(ord.totalAmount || 0).toLocaleString("en-IN")} (${ord.paymentMethod || "COD"})</p>
            </div>
          </div>
        `;
      })
      .join("");
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Lucky Couture Daily Fulfillment Report</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: ${bgColor}; font-family: 'Segoe UI', Arial, sans-serif; color: #222222; -webkit-font-smoothing: antialiased;">
        <div style="max-width: 640px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #E8E0D5; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <div style="background-color: ${primaryColor}; padding: 28px 32px; color: #ffffff; text-align: left;">
            <span style="color: ${accentColor}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">LUCKY COUTURE BOUTIQUE</span>
            <h1 style="margin: 6px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">Daily Order Fulfillment Report</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #E8D5C4;">${dateDisplay} · 10:00 AM IST Report</p>
          </div>

          <!-- Content Body -->
          <div style="padding: 28px 32px; background-color: ${bgColor};">
            
            <!-- Summary Bar -->
            <div style="background-color: #ffffff; padding: 18px 24px; border-radius: 12px; border: 1px solid #E8E0D5; margin-bottom: 24px; display: flex; justify-content: space-around; text-align: center;">
              <div style="flex: 1; border-right: 1px solid #F3EFE9;">
                <span style="font-size: 12px; color: #666666; display: block; font-weight: 500;">Today's Orders</span>
                <strong style="font-size: 24px; color: #92400E; font-weight: 700;">${todaysOrders.length}</strong>
              </div>
              <div style="flex: 1;">
                <span style="font-size: 12px; color: #666666; display: block; font-weight: 500;">Overdue Orders</span>
                <strong style="font-size: 24px; color: ${overdueOrders.length > 0 ? "#991B1B" : "#166534"}; font-weight: 700;">${overdueOrders.length}</strong>
              </div>
            </div>

            <!-- Section 1: Today's Orders -->
            <div style="margin-bottom: 28px;">
              <h3 style="font-size: 16px; font-weight: 700; color: ${primaryColor}; margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px;">
                Today's Orders (${todaysOrders.length})
              </h3>
              <p style="font-size: 12px; color: #666666; margin: 0 0 14px 0;">Orders whose internal ready/dispatch deadline is today.</p>
              ${renderOrderCards(todaysOrders, false)}
            </div>

            <!-- Section 2: Overdue Orders -->
            <div style="margin-bottom: 24px;">
              <h3 style="font-size: 16px; font-weight: 700; color: #991B1B; margin: 0 0 12px 0;">
                Overdue Orders (${overdueOrders.length})
              </h3>
              <p style="font-size: 12px; color: #666666; margin: 0 0 14px 0;">Active orders past their internal ready/dispatch deadline requiring immediate attention.</p>
              ${renderOrderCards(overdueOrders, true)}
            </div>

          </div>

          <!-- Footer -->
          <div style="background-color: #ffffff; padding: 20px 32px; border-top: 1px solid #E8E0D5; font-size: 12px; color: #888888; text-align: center; line-height: 1.5;">
            <p style="margin: 0 0 4px 0;">Lucky Couture Automated Operational Email System</p>
            <p style="margin: 0; font-size: 11px; color: #aaaaaa;">Generated automatically from live production database on ${dateDisplay} at 10:00 AM IST.</p>
          </div>

        </div>
      </body>
    </html>
  `;
}

/**
 * Builds Plain Text Email Template for Daily Report
 */
function buildEmailText({ dateDisplay, todaysOrders, overdueOrders }) {
  let text = `LUCKY COUTURE — DAILY FULFILLMENT REPORT\n`;
  text += `${dateDisplay} · 10:00 AM IST Report\n\n`;
  text += `SUMMARY:\n`;
  text += `- Today's Orders: ${todaysOrders.length}\n`;
  text += `- Overdue Orders: ${overdueOrders.length}\n\n`;

  text += `========================================\n`;
  text += `TODAY'S ORDERS (Total: ${todaysOrders.length})\n`;
  text += `========================================\n`;
  if (todaysOrders.length === 0) {
    text += `No orders scheduled for ready/dispatch deadline today.\n\n`;
  } else {
    todaysOrders.forEach((ord, idx) => {
      text += `${idx + 1}. Order #${ord.orderId || ord.displayId}\n`;
      text += `   Customer: ${ord.customer?.name || "Customer"} (${ord.customer?.phone || ""})\n`;
      text += `   Type: ${getOrderTypeBadge(ord.orderKind)}\n`;
      text += `   Status: ${ord.status}\n`;
      text += `   Total: ₹${ord.totalAmount}\n\n`;
    });
  }

  text += `========================================\n`;
  text += `OVERDUE ORDERS (Total: ${overdueOrders.length})\n`;
  text += `========================================\n`;
  if (overdueOrders.length === 0) {
    text += `No overdue orders.\n\n`;
  } else {
    overdueOrders.forEach((ord, idx) => {
      text += `${idx + 1}. Order #${ord.orderId || ord.displayId} (${ord.daysOverdue} days overdue)\n`;
      text += `   Customer: ${ord.customer?.name || "Customer"} (${ord.customer?.phone || ""})\n`;
      text += `   Type: ${getOrderTypeBadge(ord.orderKind)}\n`;
      text += `   Status: ${ord.status}\n`;
      text += `   Total: ₹${ord.totalAmount}\n\n`;
    });
  }

  text += `Lucky Couture Website System\n`;
  return text;
}

module.exports = {
  generateAndSendDailyReport,
  getISTDateKey,
  getISTFormattedDate,
};
