const TONES = {
  ACTIVE: "active",
  OK: "active",
  DONE: "active",
  LOADING: "pending",
  RUNNING: "pending",
  RETIRED: "inactive",
  FAILED: "rejected",
};

// Reuses the DataTable status-pill styles so AML states look like every
// other status in the Console.
export function StatusPill({ status, label }) {
  const tone = TONES[status] ?? "inactive";
  return <span className={`dt__status dt__status--${tone}`}>{label ?? (status || "Never run")}</span>;
}
