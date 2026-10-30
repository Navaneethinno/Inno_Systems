import "./StatusFilterTabs.css";

const LABELS = { all: "All", active: "Active", pending: "Pending", inactive: "Inactive" };
const TONES = { active: "active", pending: "pending" };

/**
 * All / Active / Pending tabs, each with its count. `counts` ({ all, active,
 * pending } or any other filter names) picks the tabs; master data uses
 * all / active / inactive. The older totalCount / activeCount / pendingCount
 * props still work.
 */
export function StatusFilterTabs({ filter, onChange, counts, totalCount, activeCount, pendingCount }) {
  const tabs = counts ?? { all: totalCount, active: activeCount, pending: pendingCount };
  return (
    <div className="sft" role="tablist" aria-label="Filter by status">
      {Object.entries(tabs).map(([key, count]) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={filter === key}
          className={`sft__tab ${filter === key ? "sft__tab--active" : ""}`}
          onClick={() => onChange(key)}
        >
          {LABELS[key] ?? key}
          {count > 0 && <span className={`sft__count ${TONES[key] ? `sft__count--${TONES[key]}` : ""}`}>{count}</span>}
        </button>
      ))}
    </div>
  );
}
