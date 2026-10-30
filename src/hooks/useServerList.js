import { useCallback, useEffect, useState } from "react";
import { systemService } from "../features/system/services/systemService";

const PAGE_SIZE = 10;
const SEARCH_DELAY_MS = 300;
const DEFAULT_FILTERS = ["all", "active", "pending"];

/**
 * One server-paged list: the current page's rows, the All / Active /
 * Pending tab counts, and search. Paging, the `filter` tabs and `search`
 * all run on the server, as the backend asks; each tab's count is that
 * filter's `totalRecords`, so it always agrees with what the tab shows.
 *
 * `params` adds fixed fields to every call (e.g. `{ inst_profile_id }`);
 * pass a stable object (useMemo) so it doesn't refetch on every render.
 * `filters` names the tabs to count: master data has no maker-checker, so
 * its lists use all / active / inactive instead of the default.
 * `refresh()` reloads quietly, keeping the rows on screen.
 */
export function useServerList(listPath, params, filters = DEFAULT_FILTERS) {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [counts, setCounts] = useState(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  // Search waits for a pause in typing, and starts again from page 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [query]);

  // A different list (another institution picked) starts from page 1.
  useEffect(() => {
    setPage(1);
  }, [listPath, params]);

  const changeFilter = useCallback((next) => {
    setFilter(next);
    setPage(1);
  }, []);

  const fetchPage = useCallback(
    (args) => systemService.pageList(listPath, { limit: PAGE_SIZE, filter, search, params, ...args }),
    [listPath, filter, search, params]
  );

  useEffect(() => {
    let cancelled = false;
    if (tick === 0) setIsLoading(true);
    setError(null);
    fetchPage({ page })
      .then((result) => {
        if (cancelled) return;
        setRows(result.rows);
        setPagination(result.pagination);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [fetchPage, page, tick]);

  // The tab counts: one row per filter is enough to read its total.
  useEffect(() => {
    let cancelled = false;
    Promise.all(filters.map((f) => systemService.pageList(listPath, { page: 1, limit: 1, filter: f, search, params })))
      .then((results) => {
        if (cancelled) return;
        setCounts(Object.fromEntries(results.map((r, i) => [filters[i], r.pagination?.totalRecords ?? r.rows.length])));
      })
      .catch(() => !cancelled && setCounts(null));
    return () => {
      cancelled = true;
    };
    // filters is a constant per caller; joining keeps an inline array stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listPath, search, params, tick, filters.join()]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return {
    rows,
    pagination,
    counts,
    page,
    setPage,
    filter,
    changeFilter,
    query,
    setQuery,
    search,
    isLoading,
    error,
    refresh,
    fetchPage,
  };
}
