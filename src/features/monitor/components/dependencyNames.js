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
export const depStatus = (s) => ({ up: "Up", degraded: "Degraded", down: "Down", unknown: "Unknown" })[s] ?? s ?? "—";
// `unknown` means a probe reported no status: neutral, not a failure.
export const depTone = (s) => (s === "up" ? "ok" : s === "degraded" ? "warn" : s && s !== "unknown" ? "bad" : undefined);
// Rows come one per dependency and processor.
export const depKey = (r) => `${r.dependency}|${r.service ?? ""}`;
// Lower-case names (elasticsearch, redis) are probes on the server itself;
// upper-case names are partners.
export const isServerProbe = (name) => {
  const s = String(name ?? "");
  return s !== "" && s === s.toLowerCase();
};
