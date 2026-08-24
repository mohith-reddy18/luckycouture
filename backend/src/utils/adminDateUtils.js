/**
 * Centralized Date & Timezone utilities for Admin Order & Dashboard management.
 * Guarantees consistent Indian Standard Time (IST, UTC+5:30) date boundaries
 * across all server environments.
 */

// IST is UTC + 5 hours 30 minutes (330 minutes)
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Returns UTC Date objects for start and end of a specific IST date window.
 */
function getISTDateBoundaries(referenceDate = new Date()) {
  const refTime = referenceDate.getTime();
  const istTime = new Date(refTime + IST_OFFSET_MS);

  const istYear = istTime.getUTCFullYear();
  const istMonth = istTime.getUTCMonth();
  const istDay = istTime.getUTCDate();

  // Start of today in IST (00:00:00.000 IST) converted to UTC
  const todayStart = new Date(Date.UTC(istYear, istMonth, istDay, 0, 0, 0, 0) - IST_OFFSET_MS);
  // End of today in IST (23:59:59.999 IST) converted to UTC
  const todayEnd = new Date(Date.UTC(istYear, istMonth, istDay, 23, 59, 59, 999) - IST_OFFSET_MS);

  // Start & End of tomorrow in IST
  const tomorrowStart = new Date(Date.UTC(istYear, istMonth, istDay + 1, 0, 0, 0, 0) - IST_OFFSET_MS);
  const tomorrowEnd = new Date(Date.UTC(istYear, istMonth, istDay + 1, 23, 59, 59, 999) - IST_OFFSET_MS);

  // Start of current month in IST (1st of month at 00:00:00.000 IST)
  const monthStart = new Date(Date.UTC(istYear, istMonth, 1, 0, 0, 0, 0) - IST_OFFSET_MS);

  return {
    todayStart,
    todayEnd,
    tomorrowStart,
    tomorrowEnd,
    monthStart,
  };
}

/**
 * Checks whether a given timestamp/date falls within IST Today.
 */
function isISTToday(dateVal) {
  if (!dateVal) return false;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return false;
  const { todayStart, todayEnd } = getISTDateBoundaries();
  return d >= todayStart && d <= todayEnd;
}

/**
 * Checks whether a given timestamp/date falls within IST Tomorrow.
 */
function isISTTomorrow(dateVal) {
  if (!dateVal) return false;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return false;
  const { tomorrowStart, tomorrowEnd } = getISTDateBoundaries();
  return d >= tomorrowStart && d <= tomorrowEnd;
}

/**
 * Checks whether a given timestamp/date is strictly before IST Today (Overdue threshold).
 */
function isISTOverdue(dateVal) {
  if (!dateVal) return false;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return false;
  const { todayStart } = getISTDateBoundaries();
  return d < todayStart;
}

module.exports = {
  IST_OFFSET_MS,
  getISTDateBoundaries,
  isISTToday,
  isISTTomorrow,
  isISTOverdue,
};
