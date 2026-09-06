import "./StatusFilterTabs.css";

export function StatusFilterTabs({ filter, onChange, pendingCount }) {
  return (
    <div className="sft" role="tablist" aria-label="Filter by status">
      <button
        type="button"
        role="tab"
        aria-selected={filter === "active"}
        className={`sft__tab ${filter === "active" ? "sft__tab--active" : ""}`}
        onClick={() => onChange("active")}
      >
        Active
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={filter === "pending"}
        className={`sft__tab ${filter === "pending" ? "sft__tab--active" : ""}`}
        onClick={() => onChange("pending")}
      >
        Pending
        {pendingCount > 0 && <span className="sft__count">{pendingCount}</span>}
      </button>
    </div>
  );
}
