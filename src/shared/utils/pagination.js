export const normalizePaginated = (payload) => {
  if (Array.isArray(payload)) {
    return { count: payload.length, next: null, previous: null, results: payload };
  }
  return {
    count: Number(payload?.count || 0),
    next: payload?.next || null,
    previous: payload?.previous || null,
    results: Array.isArray(payload?.results) ? payload.results : [],
  };
};

export const normalizeList = (payload) => normalizePaginated(payload).results;

export const buildPageParams = ({ page = 1, pageSize = 20, search = '', ...rest } = {}) => ({
  ...rest,
  page,
  page_size: pageSize,
  ...(search ? { search } : {}),
});
