import { useEffect, useState } from "react";
import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { DataTable } from "../../../components/ui/DataTable";
import { Modal } from "../../../components/ui/Modal";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Select } from "../../../components/ui/Select";
import { TextField } from "../../../components/ui/TextField";
import { accessService } from "../../access/services/accessService";
import { LineChart, MiniTable, Panel, Tile, fmtMs, fmtNum, fmtPct } from "../../monitor/components/monitorShared";
import { usageService } from "../services/usageService";
import "../../monitor/components/PlatformMonitor.css";
import "./Usage.css";

const TABS = [
  ["overview", "Overview"],
  ["logins", "Sign-ins"],
  ["sessions", "Sessions"],
  ["screens", "Screens"],
  ["actions", "Actions"],
  ["errors", "Errors"],
  ["users", "Users"],
];
const PRESETS = [
  ["1", "Today"],
  ["7", "Last 7 days"],
  ["30", "Last 30 days"],
  ["custom", "Custom"],
];
const LIMIT = 10;

// Dates are platform time (India), as the backend counts them.
const dayOf = (date) => date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const daysBack = (n) => dayOf(new Date(Date.now() - n * 86400000));
const country = (c) => (c ? c : "Private / unknown");
const minutes = (v) => (v == null ? "—" : `${fmtNum(v, 1)} min`);
const shortDay = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString([], { day: "2-digit", month: "short" }) : "");

function useUsage(call, body, { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, error: null });
  const key = JSON.stringify(body);
  useEffect(() => {
    if (!enabled) return undefined;
    let live = true;
    setState((s) => ({ data: s.data, error: null }));
    usageService
      .view(call, JSON.parse(key))
      .then((data) => live && setState({ data, error: null }))
      .catch((err) => live && setState({ data: {}, error: err.message }));
    return () => {
      live = false;
    };
  }, [call, key, enabled]);
  return state;
}

// A server-paged list: back to page 1 whenever the filters change.
function usePaged(call, filters) {
  const key = JSON.stringify(filters);
  const [paging, setPaging] = useState({ key, page: 1 });
  const page = paging.key === key ? paging.page : 1;
  const { data, error } = useUsage(call, { ...filters, page, limit: LIMIT });
  const total = Number(data?.total ?? 0);
  return {
    data,
    error,
    rows: data?.items,
    page,
    onPageChange: (p) => setPaging({ key, page: p }),
    pagination: { totalRecords: total, totalPages: Math.max(1, Math.ceil(total / LIMIT)) },
  };
}

const Err = ({ error }) => (error ? <Alert>{error}</Alert> : null);
const Bad = ({ n }) => <span className={n ? "pm__bad" : undefined}>{fmtNum(n)}</span>;

// Every day of the period, with the days that had no activity as zeros.
function fillDays(daily, from, to) {
  const byDay = Object.fromEntries((daily ?? []).map((d) => [d.day, d]));
  const out = [];
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`) && out.length < 400; d = new Date(d.getTime() + 86400000)) {
    const day = d.toISOString().slice(0, 10);
    out.push({ t: day, logins: 0, users: 0, calls: 0, errors: 0, active_minutes: 0, ...byDay[day] });
  }
  return out;
}

function OverviewTab({ filters, onInstitution }) {
  const { data, error } = useUsage("summary", filters);
  const insts = data?.institutions ?? [];
  const sum = (k) => insts.reduce((a, i) => a + (Number(i[k]) || 0), 0);
  const calls = sum("calls");
  const period = data?.period ?? filters;
  const columns = [
    { key: "inst_profile_name", label: "Institution", render: (i) => <b>{i.inst_profile_name}</b> },
    { key: "active_minutes", label: "Active", render: (i) => minutes(i.active_minutes) },
    { key: "active_users", label: "Users", render: (i) => fmtNum(i.active_users) },
    { key: "sessions", label: "Sessions", render: (i) => fmtNum(i.sessions) },
    { key: "logins_ok", label: "Sign-ins", render: (i) => <span className="nowrap">{fmtNum(i.logins_ok)}{i.logins_failed ? <span className="pm__bad"> · {fmtNum(i.logins_failed)} failed</span> : null}</span> },
    { key: "calls", label: "Calls", render: (i) => fmtNum(i.calls) },
    { key: "error_rate", label: "Errors", render: (i) => <span className={i.errors ? "pm__bad" : undefined}>{fmtNum(i.errors)} ({fmtPct(i.error_rate)})</span> },
    { key: "top_screen", label: "Top screen", render: (i) => i.top_screen || "—" },
    { key: "countries", label: "Countries", sortable: false, render: (i) => (i.countries ?? []).map(country).join(", ") || "—" },
    { key: "last_seen", label: "Last seen", render: (i) => <span className="nowrap muted">{i.last_seen || "—"}</span> },
  ];
  return (
    <>
      <Err error={error} />
      {Number(data?.dropped_since_start) > 0 && <Alert>The server was too busy to record {fmtNum(data.dropped_since_start)} steps since it started; the figures are a little low.</Alert>}
      <div className="pm__tiles">
        <Tile label="Institutions active" value={data ? fmtNum(insts.length) : "…"} />
        <Tile label="Users active" value={data ? fmtNum(sum("active_users")) : "…"} />
        <Tile label="Time in the portal" value={data ? minutes(sum("active_minutes")) : "…"} />
        <Tile label="Sign-ins" value={data ? fmtNum(sum("logins_ok")) : "…"} hint={data && sum("logins_failed") ? `${fmtNum(sum("logins_failed"))} failed` : undefined} tone={data && sum("logins_failed") ? "warn" : undefined} />
        <Tile label="Calls" value={data ? fmtNum(calls) : "…"} />
        <Tile label="Error rate" value={data ? fmtPct(calls ? (sum("errors") / calls) * 100 : 0) : "…"} hint={data ? `${fmtNum(sum("errors"))} failed calls` : undefined} tone={data && sum("errors") ? "warn" : undefined} />
      </div>
      <div className="pm__grid">
        <Panel title="Per day" hint="Days without activity show as 0.">
          <LineChart rows={data ? fillDays(data.daily, period.from, period.to) : []} lines={[{ key: "active_minutes", label: "Minutes" }, { key: "calls", label: "Calls" }, { key: "errors", label: "Errors" }, { key: "logins", label: "Sign-ins" }]} tick={shortDay} when={shortDay} />
        </Panel>
        <Panel title="Countries" hint="Where the sign-ins and calls came from.">
          <MiniTable
            rows={data?.countries}
            empty="No activity in this period."
            columns={[
              { key: "country", label: "Country", render: (c) => country(c.country) },
              { key: "users", label: "Users", render: (c) => fmtNum(c.users) },
              { key: "ips", label: "IPs", render: (c) => fmtNum(c.ips) },
              { key: "calls", label: "Calls", render: (c) => fmtNum(c.calls) },
            ]}
          />
        </Panel>
      </div>
      <DataTable
        columns={columns}
        rows={data ? insts : undefined}
        isLoading={!data}
        actions={filters.inst_profile_id ? undefined : (i) => <Button size="sm" variant="secondary" onClick={() => onInstitution(i.inst_profile_id)}>Open</Button>}
        emptyMessage="No institution used the admin portal in this period."
      />
    </>
  );
}

function LoginsTab({ filters }) {
  const [status, setStatus] = useState("");
  const list = usePaged("logins", { ...filters, ...(status && { status }) });
  const columns = [
    { key: "at", label: "When", render: (r) => <span className="nowrap">{r.at}</span> },
    { key: "inst_profile_name", label: "Institution" },
    { key: "user_name", label: "User", render: (r) => <span>{r.user_name}{r.user_id == null && <span className="muted"> (no such user)</span>}</span> },
    { key: "status", label: "Result", render: (r) => <span className={r.status === "FAIL" ? "pm__bad" : "pm__ok"}>{r.status === "FAIL" ? "Failed" : "Signed in"}</span> },
    { key: "reason", label: "Reason", render: (r) => r.reason || "—" },
    { key: "ip", label: "IP", render: (r) => <span className="nowrap">{r.ip} · {country(r.country)}</span> },
    { key: "user_agent", label: "Browser", sortable: false, render: (r) => <span className="us__agent" title={r.user_agent}>{r.user_agent || "—"}</span> },
  ];
  return (
    <>
      <Err error={list.error} />
      <div className="pm__filters">
        <Select label="Result" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: "", label: "All" }, { value: "SUCCESS", label: "Signed in" }, { value: "FAIL", label: "Failed" }]} />
      </div>
      <DataTable columns={columns} rows={list.rows} isLoading={!list.data} page={list.page} onPageChange={list.onPageChange} pagination={list.pagination} emptyMessage="No sign-ins in this period." />
    </>
  );
}

function SessionsTab({ filters, user, onClearUser, onJourney }) {
  const list = usePaged("sessions", { ...filters, ...(user && { user_id: user.user_id }) });
  const columns = [
    { key: "started", label: "Started", render: (r) => <span className="nowrap">{r.started}</span> },
    { key: "user_name", label: "User" },
    { key: "inst_profile_name", label: "Institution" },
    { key: "minutes", label: "Length", render: (r) => minutes(r.minutes) },
    { key: "screens", label: "Screens", render: (r) => fmtNum(r.screens) },
    { key: "calls", label: "Calls", render: (r) => fmtNum(r.calls) },
    { key: "errors", label: "Errors", render: (r) => <Bad n={r.errors} /> },
    { key: "top_screen", label: "Top screen", render: (r) => r.top_screen || "—" },
    { key: "ip", label: "IP", render: (r) => <span className="nowrap">{r.ip} · {country(r.country)}</span> },
  ];
  return (
    <>
      <Err error={list.error} />
      {user && (
        <div className="us__chip-row">
          <span className="pm__chip">
            User: <b>{user.user_name}</b>
            <button type="button" className="us__chip-x" aria-label="Show every user" onClick={onClearUser}>
              ×
            </button>
          </span>
        </div>
      )}
      <DataTable
        columns={columns}
        rows={list.rows}
        isLoading={!list.data}
        page={list.page}
        onPageChange={list.onPageChange}
        pagination={list.pagination}
        actions={(r) => <Button size="sm" variant="secondary" onClick={() => onJourney(r)}>Journey</Button>}
        emptyMessage="No sessions in this period."
      />
    </>
  );
}

function ScreensTab({ filters }) {
  const { data, error } = useUsage("screens", filters);
  const items = data?.items ?? [];
  const top = Math.max(1, ...items.map((s) => Number(s.minutes) || 0));
  const columns = [
    { key: "screen", label: "Screen", render: (s) => <span><b>{s.menu_label ?? s.screen}</b>{(s.module_label ?? s.module_name) && <span className="muted"> · {s.module_label ?? s.module_name}</span>}</span> },
    { key: "minutes", label: "Time", render: (s) => (
        <span className="us__bar-cell">
          <span className="us__bar"><i style={{ width: `${((Number(s.minutes) || 0) / top) * 100}%` }} /></span>
          <span className="nowrap">{minutes(s.minutes)} · {fmtPct(s.share)}</span>
        </span>
      ) },
    { key: "users", label: "Users", render: (s) => fmtNum(s.users) },
    { key: "sessions", label: "Sessions", render: (s) => fmtNum(s.sessions) },
    { key: "views", label: "Opened", render: (s) => fmtNum(s.views) },
    { key: "calls", label: "Calls", render: (s) => fmtNum(s.calls) },
    { key: "errors", label: "Errors", render: (s) => <Bad n={s.errors} /> },
    { key: "last_used", label: "Last used", render: (s) => <span className="nowrap muted">{s.last_used || "—"}</span> },
  ];
  return (
    <>
      <Err error={error} />
      {data && <p className="pm__note">Total time in this period: {minutes(data.total_minutes)}. Time on a step counts until the next step, up to 5 minutes.</p>}
      <DataTable columns={columns} rows={data ? items : undefined} isLoading={!data} emptyMessage="No screens used in this period." />
    </>
  );
}

// The screens a filter can narrow to: those the Screens report found.
function useScreenOptions(filters) {
  const { data } = useUsage("screens", filters);
  return [{ value: "", label: "All" }, ...(data?.items ?? []).filter((s) => s.menu_id != null).map((s) => ({ value: String(s.menu_id), label: s.menu_label ?? s.screen }))];
}

function ActionsTab({ filters }) {
  const [menu, setMenu] = useState("");
  const options = useScreenOptions(filters);
  const list = usePaged("actions", { ...filters, ...(menu && { menu_id: Number(menu) }) });
  const columns = [
    { key: "menu_name", label: "Screen", render: (r) => r.menu_label ?? r.menu_name ?? "—" },
    { key: "action_name", label: "Action", render: (r) => r.action_name ?? <span className="muted">No permission needed</span> },
    { key: "path", label: "Call", render: (r) => <code className="pm__sql">{r.path}</code> },
    { key: "calls", label: "Calls", render: (r) => fmtNum(r.calls) },
    { key: "users", label: "Users", render: (r) => fmtNum(r.users) },
    { key: "errors", label: "Errors", render: (r) => <span className={r.errors ? "pm__bad" : undefined}>{fmtNum(r.errors)} ({fmtPct(r.error_rate)})</span> },
    { key: "avg_ms", label: "Average", render: (r) => fmtMs(r.avg_ms) },
    { key: "max_ms", label: "Slowest", render: (r) => fmtMs(r.max_ms) },
    { key: "last_at", label: "Last", render: (r) => <span className="nowrap muted">{r.last_at}</span> },
  ];
  return (
    <>
      <Err error={list.error} />
      <div className="pm__filters">
        <Select label="Screen" value={menu} onChange={(e) => setMenu(e.target.value)} options={options} />
      </div>
      <DataTable columns={columns} rows={list.rows} isLoading={!list.data} page={list.page} onPageChange={list.onPageChange} pagination={list.pagination} emptyMessage="No calls in this period." />
    </>
  );
}

function ErrorsTab({ filters }) {
  const [menu, setMenu] = useState("");
  const options = useScreenOptions(filters);
  const list = usePaged("errors", { ...filters, ...(menu && { menu_id: Number(menu) }) });
  const columns = [
    { key: "count", label: "Times", render: (r) => <b className="pm__bad">{fmtNum(r.count)}</b> },
    { key: "message", label: "What the user saw", render: (r) => <span>{r.message || "—"}<br /><span className="muted">{r.error_code}{r.http_status ? ` · HTTP ${r.http_status}` : ""}</span></span> },
    { key: "menu_name", label: "Screen", render: (r) => r.menu_label ?? r.menu_name ?? "—" },
    { key: "path", label: "Call", render: (r) => <code className="pm__sql">{r.path}</code> },
    { key: "users", label: "Users", render: (r) => fmtNum(r.users) },
    { key: "institutions", label: "Institutions", render: (r) => fmtNum(r.institutions) },
    { key: "last_at", label: "Last", render: (r) => <span className="nowrap muted">{r.last_at}<br />{r.last_user}</span> },
  ];
  return (
    <>
      <Err error={list.error} />
      <div className="pm__filters">
        <Select label="Screen" value={menu} onChange={(e) => setMenu(e.target.value)} options={options} />
      </div>
      {list.data && <p className="pm__note">{fmtNum(list.data.total_errors)} failed steps in {fmtNum(list.data.total)} groups. Failed sign-ins are included.</p>}
      <DataTable columns={columns} rows={list.rows} isLoading={!list.data} page={list.page} onPageChange={list.onPageChange} pagination={list.pagination} emptyMessage="No errors in this period." />
    </>
  );
}

function UsersTab({ filters, onSessions }) {
  const { data, error } = useUsage("users", filters);
  const columns = [
    { key: "user_name", label: "User", render: (u) => <b>{u.user_name}</b> },
    { key: "inst_profile_name", label: "Institution" },
    { key: "minutes", label: "Time", render: (u) => minutes(u.minutes) },
    { key: "sessions", label: "Sessions", render: (u) => fmtNum(u.sessions) },
    { key: "logins", label: "Sign-ins", render: (u) => <span className="nowrap">{fmtNum(u.logins)}{u.failed_logins ? <span className="pm__bad"> · {fmtNum(u.failed_logins)} failed</span> : null}</span> },
    { key: "calls", label: "Calls", render: (u) => fmtNum(u.calls) },
    { key: "errors", label: "Errors", render: (u) => <Bad n={u.errors} /> },
    { key: "top_screen", label: "Top screen", render: (u) => u.top_screen || "—" },
    { key: "ips", label: "From", sortable: false, render: (u) => <span className="muted">{[...(u.countries ?? []).map(country), ...(u.ips ?? [])].join(", ") || "—"}</span> },
    { key: "last_seen", label: "Last seen", render: (u) => <span className="nowrap muted">{u.last_seen}</span> },
  ];
  return (
    <>
      <Err error={error} />
      <DataTable columns={columns} rows={data ? data.items ?? [] : undefined} isLoading={!data} actions={(u) => <Button size="sm" variant="secondary" onClick={() => onSessions(u)}>Sessions</Button>} emptyMessage="No one used the admin portal in this period." />
    </>
  );
}

const KIND = { LOGIN: "Signed in", VIEW: "Opened", API: "Did" };

// One user's steps in order; failed steps in red with what the user saw.
function JourneyModal({ journey, filters, onClose }) {
  const [page, setPage] = useState(1);
  const { data, error } = useUsage("journey", { from: filters.from, to: filters.to, user_id: journey.user_id, ...(journey.session != null && { session: journey.session }), page, limit: 50 });
  const total = Number(data?.total ?? 0);
  const pages = Math.max(1, Math.ceil(total / 50));
  return (
    <Modal title={`Journey: ${journey.user_name}`} subtitle={journey.session != null ? `Session ${journey.session}, started ${journey.started}` : "The whole period"} onClose={onClose} width={860}>
      <Err error={error} />
      {!data && <p className="muted">Loading…</p>}
      {data && !(data.items ?? []).length && <p className="muted">No steps.</p>}
      <ol className="us__timeline">
        {(data?.items ?? []).map((s, i) => (
          <li key={`${s.at}:${i}`} className={`us__step us__step--${s.kind?.toLowerCase()} ${s.ok === false ? "us__step--bad" : ""}`}>
            <span className="us__step-time">{s.at?.slice(11) || s.at}</span>
            <div className="us__step-body">
              <div>
                <b>{KIND[s.kind] ?? s.kind}</b> {s.screen}
                {s.action_name && <span className="muted"> · {s.action_name}</span>}
                {s.duration_ms != null && <span className="muted"> · {fmtMs(s.duration_ms)}</span>}
                {Number(s.seconds) > 0 && <span className="muted"> · then {fmtNum(s.seconds, 1)} s</span>}
              </div>
              {s.kind === "API" && <code className="pm__sql">{s.path}</code>}
              {s.ok === false && (
                <div className="pm__bad">
                  {s.message || "Failed"} <span className="muted">({s.error_code})</span>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
      {pages > 1 && (
        <div className="us__pager">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Earlier
          </Button>
          <span className="muted">
            Page {page} of {pages} · {fmtNum(total)} steps
          </span>
          <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Later
          </Button>
        </div>
      )}
    </Modal>
  );
}

// SYSTEM > Usage: how each institution's staff use the admin portal, to see
// what they try and where the product gets in their way.
export function UsagePage() {
  const [tab, setTab] = useState("overview");
  const [inst, setInst] = useState("");
  const [preset, setPreset] = useState("7");
  const [custom, setCustom] = useState({ from: daysBack(6), to: dayOf(new Date()) });
  const [withSystem, setWithSystem] = useState(false);
  const [user, setUser] = useState(null);
  const [journey, setJourney] = useState(null);
  const [nonce, setNonce] = useState(0);
  const [institutions, setInstitutions] = useState([]);
  useEffect(() => {
    accessService
      .list()
      .then((list) => setInstitutions(list.filter((i) => i.inst_profile_id).sort((a, b) => String(a.inst_profile_name ?? "").localeCompare(String(b.inst_profile_name ?? "")))))
      .catch(() => setInstitutions([]));
  }, []);
  const period = preset === "custom" ? custom : { from: daysBack(Number(preset) - 1), to: dayOf(new Date()) };
  const badRange = preset === "custom" && (!custom.from || !custom.to || custom.from > custom.to);
  const filters = { from: period.from, to: period.to, ...(inst && { inst_profile_id: Number(inst) }), ...(withSystem && { include_system: true }) };
  const props = { filters };
  return (
    <div className="page">
      <PageHeader
        eyebrow="System"
        title="Usage"
        subtitle="How each institution's staff use the admin portal: who signs in and from where, the screens they spend time on, what they do and the errors they meet."
        actions={
          <Button variant="secondary" onClick={() => setNonce((n) => n + 1)} icon="refresh">
            Reload
          </Button>
        }
      />
      <div className="pm__filters">
        <Select
          label="Institution"
          value={inst}
          onChange={(e) => {
            setInst(e.target.value);
            setUser(null);
          }}
          options={[{ value: "", label: "All" }, ...institutions.map((i) => ({ value: String(i.inst_profile_id), label: i.inst_profile_name ?? i.inst_code }))]}
        />
        <Select label="Period" value={preset} onChange={(e) => setPreset(e.target.value)} options={PRESETS.map(([value, label]) => ({ value, label }))} />
        {preset === "custom" && (
          <>
            <TextField label="From" type="date" value={custom.from} max={custom.to} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
            <TextField label="To" type="date" value={custom.to} min={custom.from} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
          </>
        )}
        <label className="us__check">
          <input type="checkbox" checked={withSystem} onChange={(e) => setWithSystem(e.target.checked)} /> Include the System user
        </label>
      </div>
      <div className="tabs" role="tablist" aria-label="Usage">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={`tabs__tab ${tab === key ? "tabs__tab--active" : ""}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      {badRange ? (
        <Alert>Pick a From date on or before the To date.</Alert>
      ) : (
        <div key={`${tab}:${nonce}`} className="pm__body" role="tabpanel">
          {tab === "overview" && <OverviewTab {...props} onInstitution={(id) => setInst(String(id))} />}
          {tab === "logins" && <LoginsTab {...props} />}
          {tab === "sessions" && <SessionsTab {...props} user={user} onClearUser={() => setUser(null)} onJourney={setJourney} />}
          {tab === "screens" && <ScreensTab {...props} />}
          {tab === "actions" && <ActionsTab {...props} />}
          {tab === "errors" && <ErrorsTab {...props} />}
          {tab === "users" && (
            <UsersTab
              {...props}
              onSessions={(u) => {
                setUser(u);
                setTab("sessions");
              }}
            />
          )}
        </div>
      )}
      {journey && <JourneyModal journey={journey} filters={filters} onClose={() => setJourney(null)} />}
    </div>
  );
}
