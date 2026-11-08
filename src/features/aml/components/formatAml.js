import { formatIst } from "../../../lib/istTime";

export const formatDateTime = formatIst;

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
