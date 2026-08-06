/**
 * Builds Mongoose pagination options + a response-ready pagination object
 * from standard `page` / `limit` query params.
 */
function getPagination(query, defaultLimit = 12, maxLimit = 60) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(query.limit, 10) || defaultLimit, maxLimit);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function buildPaginationMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(Math.ceil(total / limit), 1),
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1,
  };
}

module.exports = { getPagination, buildPaginationMeta };
