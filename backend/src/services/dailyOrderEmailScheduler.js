const { generateAndSendDailyReport, getISTDateKey } = require("./dailyOrderReportService");
const DailyReportLog = require("../models/DailyReportLog");
const { IST_OFFSET_MS } = require("../utils/adminDateUtils");

let isRunningCheck = false;

/**
 * Checks whether it is 10:00 AM IST and sends the daily report if not already sent today.
 */
async function checkAndTriggerDailyReport() {
  if (isRunningCheck) return;
  isRunningCheck = true;

  try {
    const nowUtc = new Date();
    const istTime = new Date(nowUtc.getTime() + IST_OFFSET_MS);

    const istHour = istTime.getUTCHours();
    const dateKey = getISTDateKey(nowUtc);

    // Only attempt trigger during the 10:00 AM IST hour (10:00 - 10:59 IST)
    if (istHour === 10) {
      const existingLog = await DailyReportLog.findOne({ dateKey, status: "success" });
      if (!existingLog) {
        console.log(`[DailyScheduler] 10:00 AM IST window active for date ${dateKey}. Triggering daily report...`);
        await generateAndSendDailyReport({ force: false, triggeredBy: "system_scheduler" });
      }
    }
  } catch (err) {
    console.error("[DailyScheduler:error]", err.message);
  } finally {
    isRunningCheck = false;
  }
}

/**
 * Starts the server-side daily 10 AM IST scheduler.
 */
function startDailyOrderEmailScheduler() {
  console.log("[DailyScheduler] Initialized daily 10:00 AM IST order email report scheduler.");

  // Perform an immediate check on startup
  checkAndTriggerDailyReport();

  // Run check every 60 seconds
  setInterval(() => {
    checkAndTriggerDailyReport();
  }, 60 * 1000);
}

module.exports = {
  startDailyOrderEmailScheduler,
  checkAndTriggerDailyReport,
};
