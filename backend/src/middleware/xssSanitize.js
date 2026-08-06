const xss = require("xss");

/**
 * Replaces the unmaintained xss-clean package. Recursively walks
 * req.body, req.query, and req.params and strips/escapes any HTML or
 * script content from string values, using the actively-maintained
 * `xss` library under the hood.
 *
 * Note: this is defense-in-depth against stored XSS reaching other
 * clients (e.g. an admin viewing a contact message or review in a
 * future admin UI). It is not a substitute for output encoding —
 * React already escapes rendered text by default, and this middleware
 * doesn't need to (and shouldn't) touch non-string fields like numbers,
 * booleans, ObjectIds, or dates.
 */
function sanitizeValue(value) {
  if (typeof value === "string") {
    return xss(value, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ["script", "style"] });
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const sanitized = {};
    for (const key of Object.keys(value)) {
      sanitized[key] = sanitizeValue(value[key]);
    }
    return sanitized;
  }
  return value;
}

function xssSanitize(req, res, next) {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.params) req.params = sanitizeValue(req.params);
  // req.query is a getter-only property on newer Express/Node versions —
  // mutate its keys in place rather than reassigning the object itself.
  if (req.query) {
    const sanitizedQuery = sanitizeValue(req.query);
    for (const key of Object.keys(req.query)) delete req.query[key];
    Object.assign(req.query, sanitizedQuery);
  }
  next();
}

module.exports = xssSanitize;
