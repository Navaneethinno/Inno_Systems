import { useEffect, useRef, useState } from "react";
import { monitorService } from "../services/monitorService";

// Shared pieces of the Platform Monitor: the data hook, formatters, tiles,
// panels and a small SVG line chart (the console has no chart library).

const REFRESH_MS = 60000;

// One monitor view, loaded again whenever `body` changes and every 60 s
// (nothing changes faster). `live` views (database_activity) refresh the same.
export function useMonitor(view, body, { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const key = JSON.stringify(body ?? {});
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setInterval(() => setTick((n) => n + 1), REFRESH_MS);
    return () => clearInterval(timer);
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return undefined;
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    monitorService
      .view(view, JSON.parse(key))
      .then((data) => live && setState({ data, error: null, loading: false }))
      .catch((err) => live && setState((s) => ({ data: s.data, error: err.message, loading: false })));
    return () => {
      live = false;
    };
  }, [view, key, tick, enabled]);
  return { ...state, reload: () => setTick((n) => n + 1) };
}

export const fmtNum = (v, digits = 0) => (v == null || Number.isNaN(Number(v)) ? "—" : Number(v).toLocaleString(undefined, { maximumFractionDigits: digits }));
export const fmtMs = (v) => (v == null ? "—" : Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(2)} s` : `${Number(v).toFixed(Number(v) < 10 ? 1 : 0)} ms`);
export const fmtPct = (v, digits = 1) => (v == null ? "—" : `${Number(v).toFixed(digits)}%`);
export function fmtBytes(v) {
  if (v == null || v === "") return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = Number(v);
  let i = 0;
  while (Math.abs(n) >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
}
export function fmtDuration(seconds) {
  if (seconds == null) return "—";
  const s = Math.max(0, Math.round(Number(seconds)));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : m ? `${m}m` : `${s}s`;
}
export const fmtTime = (v) => (v ? new Date(v).toLocaleString() : "—");
const fmtTick = (v) => (v ? new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "");

export function Dot({ up }) {
  return <span className={`pm__dot ${up ? "pm__dot--up" : "pm__dot--down"}`} aria-label={up ? "Up" : "Down"} />;
}

// tone: "ok" | "warn" | "bad" | undefined
export function Tile({ label, value, hint, tone, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} className={`pm__tile ${tone ? `pm__tile--${tone}` : ""} ${onClick ? "pm__tile--link" : ""}`} onClick={onClick}>
      <span className="pm__tile-label">{label}</span>
      <span className="pm__tile-value">{value}</span>
      {hint && <span className="pm__tile-hint">{hint}</span>}
    </Tag>
  );
}

export function Panel({ title, hint, action, children }) {
  return (
    <section className="pm__panel">
      {(title || action) && (
        <div className="pm__panel-head">
          <div>
            <h3 className="pm__panel-title">{title}</h3>
            {hint && <p className="pm__panel-hint">{hint}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const COLORS = ["#2266ee", "#e0342f", "#15803d", "#d97706", "#7c3aed", "#0891b2"];

// A line chart of `rows` (each with `t`): one line per `lines` entry
// ({ key, label }). Hover shows every line's value at that point.
export function LineChart({ rows, lines, format = fmtNum, height = 150 }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(null);
  const W = 600;
  const H = height;
  const pad = { l: 44, r: 8, t: 8, b: 20 };
  const data = rows ?? [];
  let max = 0;
  for (const r of data) for (const l of lines) max = Math.max(max, Number(r[l.key]) || 0);
  max = max || 1;
  if (!data.length) return <p className="pm__empty">No figures in this period.</p>;
  const x = (i) => pad.l + (data.length === 1 ? 0 : (i / (data.length - 1)) * (W - pad.l - pad.r));
  const y = (v) => pad.t + (1 - (Number(v) || 0) / max) * (H - pad.t - pad.b);
  const move = (e) => {
    const box = ref.current.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };
  const row = hover != null ? data[hover] : null;
  return (
    <div className="pm__chart">
      <div className="pm__legend">
        {lines.map((l, i) => (
          <span key={l.key}>
            <i style={{ background: COLORS[i % COLORS.length] }} /> {l.label}
            {row && <b> {format(row[l.key])}</b>}
          </span>
        ))}
        {row && <span className="pm__legend-time">{fmtTime(row.t)}</span>}
      </div>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="pm__svg" onMouseMove={move} onMouseLeave={() => setHover(null)} role="img">
        <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} className="pm__axis" />
        <line x1={pad.l} x2={W - pad.r} y1={y(max)} y2={y(max)} className="pm__gridline" />
        <text x={pad.l - 4} y={y(max) + 4} className="pm__label" textAnchor="end">
          {format(max)}
        </text>
        <text x={pad.l - 4} y={y(0)} className="pm__label" textAnchor="end">
          0
        </text>
        <text x={pad.l} y={H - 4} className="pm__label">
          {fmtTick(data[0].t)}
        </text>
        <text x={W - pad.r} y={H - 4} className="pm__label" textAnchor="end">
          {fmtTick(data[data.length - 1].t)}
        </text>
        {lines.map((l, i) => (
          <polyline key={l.key} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="1.6" points={data.map((r, n) => `${x(n)},${y(r[l.key])}`).join(" ")} />
        ))}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} className="pm__hover" />}
      </svg>
    </div>
  );
}

// A plain table for small lists (DataTable handles the big sortable ones).
export function MiniTable({ rows, columns, empty = "Nothing here." }) {
  if (!rows?.length) return <p className="pm__empty">{empty}</p>;
  return (
    <div className="pm__table-wrap">
      <table className="pm__table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.num ? "pm__num" : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key} className={c.num ? "pm__num" : undefined}>
                  {c.render ? c.render(r) : (r[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
