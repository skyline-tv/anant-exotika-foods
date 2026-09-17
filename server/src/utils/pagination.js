const { PAGINATION } = require('./constants');

const getPagination = (query = {}) => {
  const page = Math.max(
    1,
    parseInt(query.page, 10) || PAGINATION.DEFAULT_PAGE
  );
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(query.limit, 10) || PAGINATION.DEFAULT_LIMIT)
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const buildPagination = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit) || 0,
});

module.exports = {
  getPagination,
  buildPagination,
};
