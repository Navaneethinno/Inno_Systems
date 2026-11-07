// Outbound partners and the server's own dependencies: a readable name and a
// status tone (degraded = failing, but fewer than fail_after in a row).
export function depName(name) {
  const s = String(name ?? "");
  if (s === "elasticsearch") return "Elasticsearch";
  if (s === "redis") return "Redis";
  if (s === "CREDIT_BUREAU") return "Credit bureau";
  if (s.startsWith("PROVIDER:")) return `Provider ${s.slice(9)}`;
  if (s.startsWith("NETWORK:")) return `Card network ${s.slice(8)}`;
  return s || "—";
}
export const depStatus = (s) => ({ up: "Up", degraded: "Degraded", down: "Down" })[s] ?? s ?? "—";
export const depTone = (s) => (s === "up" ? "ok" : s === "degraded" ? "warn" : s ? "bad" : undefined);
