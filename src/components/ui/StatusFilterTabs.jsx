import "./StatusFilterTabs.css";

export function StatusFilterTabs({ filter, onChange, totalCount, activeCount, pendingCount }) {
  return (
    <div className="sft" role="tablist" aria-label="Filter by status">
      <button
        type="button"
        role="tab"
        aria-selected={filter === "all"}
        className={`sft__tab ${filter === "all" ? "sft__tab--active" : ""}`}
        onClick={() => onChange("all")}
      >
        All
        {totalCount > 0 && <span className="sft__count">{totalCount}</span>}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={filter === "active"}
        className={`sft__tab ${filter === "active" ? "sft__tab--active" : ""}`}
        onClick={() => onChange("active")}
      >
        Active
        {activeCount > 0 && <span className="sft__count sft__count--active">{activeCount}</span>}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={filter === "pending"}
        className={`sft__tab ${filter === "pending" ? "sft__tab--active" : ""}`}
        onClick={() => onChange("pending")}
      >
        Pending
        {pendingCount > 0 && <span className="sft__count sft__count--pending">{pendingCount}</span>}
      </button>
    </div>
  );
}
