import { useState, useCallback } from 'react';

/**
 * Generic hook for API calls with loading/error state management
 */
export function useApi(apiFn) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFn(...args);
      setData(res.data);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFn]);

  return { data, loading, error, execute };
}

/**
 * Hook for paginated API calls
 */
export function usePaginatedApi(apiFn, initialParams = {}) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const pageSize = initialParams.limit || 10;

  const fetch = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await apiFn({ ...initialParams, ...params, page, limit: pageSize });
      const key = Object.keys(res.data).find(k => Array.isArray(res.data[k]));
      setItems(key ? res.data[key] : []);
      setTotal(res.data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [apiFn, page, pageSize]); // eslint-disable-line

  return { items, total, page, setPage, loading, fetch, totalPages: Math.ceil(total / pageSize) };
}
