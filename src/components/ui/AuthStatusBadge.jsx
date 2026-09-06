import "./DataTable.css";

function toneFor(value) {
  const v = String(value ?? "").toUpperCase();
  if (v === "AUTHORIZED" || v === "ACTIVE") return "active";
  if (v === "REJECTED" || v === "DEAUTHORIZED") return "rejected";
  if (v.includes("PENDING")) return "pending";
  return "inactive";
}

function titleCase(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Shows whatever status text the backend actually sent (e.g. "PENDING_ADD",
 * "AUTHORIZED", "REJECTED") as a colored pill — never collapsed or
 * relabeled, just titled-cased and tinted by category. The Active/Pending
 * *filter* tabs are a separate simplification (useAuthStatusFilter); this
 * badge always reflects the real value.
 */
export function AuthStatusBadge({ value }) {
  return <span className={`dt__status dt__status--${toneFor(value)}`}>{titleCase(value)}</span>;
}
