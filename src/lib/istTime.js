// The API sends date-times only as UTC ("2026-11-08T13:40:00.000000Z") and the
// console always shows them in India time, whatever the browser's zone.
const ZONE = "Asia/Kolkata";
const FULL = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, dateStyle: "medium", timeStyle: "medium" });
const CLOCK = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
const TICK = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const UTC_VALUE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const UTC_IN_TEXT = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g;

function usingDate(value, format) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : format(date);
}

export const isUtcDateTime = (value) => typeof value === "string" && UTC_VALUE.test(value);

// A date-time in IST, labelled. A date-only value is shown as sent.
export function formatIst(value) {
  if (!value) return "—";
  if (DATE_ONLY.test(value)) return value;
  return usingDate(value, (date) => FULL.format(date) + " IST");
}

// Just the time of day, labelled.
export function formatIstClock(value) {
  if (!value) return "—";
  return usingDate(value, (date) => CLOCK.format(date) + " IST");
}

// A chart's axis tick; the chart's hover line carries the full time and "IST".
export function formatIstTick(value) {
  if (!value) return "";
  if (DATE_ONLY.test(value)) return value;
  return usingDate(value, (date) => TICK.format(date));
}

// A value of unknown type from a record: only an API date-time changes.
export const istIfDateTime = (value) => (isUtcDateTime(value) ? formatIst(value) : value);

// Free text from the server with API date-times inside it.
export const istInText = (text) => String(text).replace(UTC_IN_TEXT, (found) => formatIst(found));
