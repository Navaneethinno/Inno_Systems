// The viewer's own time zone, e.g. "your local time (Asia/Kolkata, GMT+5:30)",
// for pages to state once instead of on every timestamp.
function localZone() {
  try {
    const name = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = new Intl.DateTimeFormat("en", { timeZoneName: "shortOffset" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
    return `your local time (${[name, offset].filter(Boolean).join(", ")})`;
  } catch {
    return "your local time";
  }
}

export const LOCAL_ZONE = localZone();

export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export function formatNumber(value) {
  return value == null ? "—" : Number(value).toLocaleString();
}

export function formatBytes(value) {
  if (!value) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let n = Number(value);
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
}
