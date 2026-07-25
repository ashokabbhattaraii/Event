// Reusable query helpers for list endpoints: pagination, text search,
// equality filters, sorting, and a paginate() runner. Keeping these in one
// place means every list route behaves consistently (same query params,
// same response shape) instead of each controller reinventing it.

// Parse ?page & ?limit into safe numbers plus the mongo skip offset.
const parsePagination = (query = {}, { defaultLimit = 10, maxLimit = 100 } = {}) => {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;
  return { page, limit, skip: (page - 1) * limit };
};

// Build a case-insensitive OR-regex filter across the given fields.
// The search term is escaped so user input can't inject regex operators.
const buildSearch = (search, fields = []) => {
  const term = String(search || "").trim();
  if (!term || !fields.length) return {};
  const safe = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(safe, "i");
  return { $or: fields.map((f) => ({ [f]: rx })) };
};

// Build equality filters from an allow-list of query params.
// Empty values and the sentinel "all" are ignored (treated as "no filter").
const buildFilters = (query = {}, allowed = []) => {
  const filter = {};
  for (const key of allowed) {
    const val = query[key];
    if (val !== undefined && val !== "" && val !== "all") filter[key] = val;
  }
  return filter;
};

// Parse ?sort=field or ?sort=-field into a mongo sort object, restricted to an
// allow-list so callers can't sort by arbitrary/unindexed fields.
const parseSort = (sort, allowed = [], fallback = { createdAt: -1 }) => {
  if (!sort) return fallback;
  const desc = String(sort).startsWith("-");
  const field = desc ? String(sort).slice(1) : String(sort);
  if (!allowed.includes(field)) return fallback;
  return { [field]: desc ? -1 : 1 };
};

// Run a paginated find on a Mongoose model and return { data, pagination }.
const paginate = async (
  model,
  { filter = {}, page = 1, limit = 10, skip = 0, sort, populate, select } = {}
) => {
  let q = model.find(filter);
  if (sort) q = q.sort(sort);
  if (select) q = q.select(select);
  if (populate) {
    for (const p of [].concat(populate)) q = q.populate(p);
  }
  q = q.skip(skip).limit(limit);

  const [data, total] = await Promise.all([q, model.countDocuments(filter)]);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasMore: skip + data.length < total,
    },
  };
};

module.exports = {
  parsePagination,
  buildSearch,
  buildFilters,
  parseSort,
  paginate,
};
