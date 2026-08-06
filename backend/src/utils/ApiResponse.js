/**
 * Consistent success envelope for every API response:
 * { success, message, data, pagination? }
 */
function sendResponse(res, statusCode, message, data = null, pagination = null) {
  const body = { success: statusCode < 400, message, data };
  if (pagination) body.pagination = pagination;
  return res.status(statusCode).json(body);
}

module.exports = sendResponse;
