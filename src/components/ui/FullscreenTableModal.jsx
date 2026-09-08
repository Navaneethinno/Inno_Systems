import { useEffect, useMemo, useRef, useState } from "react";
import { DataTable } from "./DataTable";
import "./FullscreenTableModal.css";

const INFINITE_PAGE_SIZE = 50;
const SCROLL_THRESHOLD_PX = 120;

function rowMatches(row, query) {
  return Object.values(row).some((v) => {
    if (v == null || typeof v === "object") return false;
    return String(v).toLowerCase().includes(query);
  });
}

/**
 * Full-viewport version of a table: a search box that filters across every
 * raw field on each row (not just what's visibly rendered) plus the same
 * sortable DataTable, so a list with thousands of rows is still scannable —
 * type a few characters instead of scrolling.
 *
 * Two data modes:
 * - **In-memory** (default): `rows` is the parent's already-loaded array.
 *   Fine up to a few thousand rows.
 * - **Infinite scroll**: pass `fetchMore(page, limit) => Promise<{ rows,
 *   totalPages }>` and this modal loads its own pages independently of
 *   whatever the parent has, fetching the next chunk as the user scrolls
 *   near the bottom. Use this for a table that could hold far more rows
 *   than are safe to fetch/render in one shot. Search only covers what's
 *   been loaded so far in this mode — there's no server-side search to
 *   fall back to yet.
 */
export function FullscreenTableModal({ title, columns, rows, actions, onClose, fetchMore }) {
  const [query, setQuery] = useState("");
  const isInfinite = typeof fetchMore === "function";
  const scrollRef = useRef(null);

  const [infiniteRows, setInfiniteRows] = useState([]);
  const [infinitePage, setInfinitePage] = useState(0);
  const [infiniteHasMore, setInfiniteHasMore] = useState(true);
  const [infiniteLoading, setInfiniteLoading] = useState(false);
  const [infiniteError, setInfiniteError] = useState(null);
  const infinitePageRef = useRef(0);
  const infiniteLoadingRef = useRef(false);

  const loadMore = () => {
    if (!isInfinite || infiniteLoadingRef.current || !infiniteHasMore) return;
    const nextPage = infinitePageRef.current + 1;
    infiniteLoadingRef.current = true;
    setInfiniteLoading(true);
    setInfiniteError(null);
    fetchMore(nextPage, INFINITE_PAGE_SIZE)
      .then((result) => {
        setInfiniteRows((current) => [...current, ...(result.rows ?? [])]);
        infinitePageRef.current = nextPage;
        setInfinitePage(nextPage);
        setInfiniteHasMore(nextPage < (result.totalPages ?? nextPage));
      })
      .catch((err) => setInfiniteError(err.message || "Unable to load more records."))
      .finally(() => {
        infiniteLoadingRef.current = false;
        setInfiniteLoading(false);
      });
  };

  // Always-current ref so the mount effect below can call the latest
  // loadMore without listing it as a dependency — `fetchMore` is typically
  // an inline function on the parent, so its identity (and loadMore's,
  // which closes over it) changes on every unrelated parent re-render;
  // depending on it directly would re-trigger the effect and duplicate the
  // first page. Synced in its own effect (not during render) since writing
  // to a ref while rendering is unsafe.
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });

  // Modal only exists while open, so mount = open — load the first page once.
  useEffect(() => {
    loadMoreRef.current();
  }, []);

  const handleScroll = () => {
    if (!isInfinite) return;
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_THRESHOLD_PX) {
      loadMore();
    }
  };

  const sourceRows = isInfinite ? infiniteRows : rows;

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sourceRows;
    return sourceRows.filter((row) => rowMatches(row, q));
  }, [sourceRows, query]);

  const isInitialInfiniteLoad = isInfinite && infiniteLoading && infiniteRows.length === 0;

  return (
    <div className="ftm__overlay" onMouseDown={onClose}>
      <div className="ftm__panel" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="ftm__header">
          <div>
            <h2 className="ftm__title">{title}</h2>
            <p className="ftm__count">
              {isInfinite
                ? `${filteredRows.length} loaded${infiniteHasMore ? "+" : ""}`
                : `${filteredRows.length} of ${rows.length} record${rows.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <button type="button" className="ftm__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ftm__toolbar">
          <div className="ftm__search">
            <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
              <path d="m17 17-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder={isInfinite ? "Search loaded rows…" : "Search all columns…"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="ftm__body" ref={scrollRef} onScroll={handleScroll}>
          <DataTable
            columns={columns}
            rows={filteredRows}
            actions={actions}
            isLoading={isInitialInfiniteLoad}
            emptyMessage="No matching records."
            paginate={false}
          />

          {isInfinite && !isInitialInfiniteLoad && (
            <div className="ftm__infinite-status">
              {infiniteError ? (
                <>
                  <span className="ftm__infinite-error">{infiniteError}</span>
                  <button type="button" className="ftm__infinite-retry" onClick={loadMore}>
                    Retry
                  </button>
                </>
              ) : infiniteLoading ? (
                "Loading more…"
              ) : infiniteHasMore ? (
                "Scroll for more"
              ) : (
                "All records loaded"
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
