import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { DataTable } from "../../../components/ui/DataTable";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Select } from "../../../components/ui/Select";
import { TextField } from "../../../components/ui/TextField";
import { accessService } from "../services/accessService";
import "./AccessPolicy.css";

const PORTALS = [
  ["ADMIN", "Admin portal"],
  ["CUSTOMER", "Customer portal"],
  ["MERCHANT", "Merchant portal"],
];
const portalLabel = (code) => PORTALS.find(([c]) => c === code)?.[1] ?? code;
const REASONS = [
  ["", "Any reason"],
  ["IP_BLOCKED", "IP blocked"],
  ["COUNTRY_NOT_ALLOWED", "Country not allowed"],
  ["COUNTRY_UNKNOWN", "Country unknown"],
];
const reasonLabel = (code) => REASONS.find(([c]) => c === code)?.[1] ?? code;
const errorOf = (e) => e?.message ?? "Something went wrong.";
const when = (v) => (v ? new Date(String(v).replace(" ", "T")).toLocaleString() : "—");

// One portal's policy in a list cell: OPEN, or RESTRICTED with its countries.
function PolicyCell({ policy }) {
  if (!policy) return "—";
  const restricted = policy.mode === "RESTRICTED";
  return (
    <div className="acc__cell">
      <span className={`acc__mode ${restricted ? "acc__mode--restricted" : ""}`}>{policy.mode}</span>
      {restricted && <span className="acc__muted">{(policy.allowed_countries ?? []).map((c) => c.code).join(", ") || "IPs only"}</span>}
      {policy.blocked_ips?.length > 0 && <span className="acc__muted">{policy.blocked_ips.length} blocked IP(s)</span>}
      {policy.refusals_24h > 0 && <span className="acc__refused">{policy.refusals_24h} refused (24 h)</span>}
    </div>
  );
}

/**
 * SYSTEM › Access by Location: per institution and portal, OPEN or
 * RESTRICTED to countries and IPs; blocked IPs in both modes. Tabs: the
 * institutions (opening one edits its three portals and tests an address),
 * the refused requests, and the country file in use.
 */
export function AccessPolicyPage() {
  const [tab, setTab] = useState("institutions");
  const [editing, setEditing] = useState(null);
  return (
    <div className="page">
      <PageHeader
        eyebrow="System"
        title="Access by Location"
        subtitle="Where each institution's portals may be used from, by country and IP address. A saved change applies within 30 seconds; the System user is never refused."
      />
      {editing ? (
        <InstitutionPolicy instProfileId={editing} onBack={() => setEditing(null)} />
      ) : (
        <>
          <div className="tabs" role="tablist" aria-label="Access by Location">
            {[
              ["institutions", "Institutions"],
              ["refusals", "Refusals"],
              ["geoip", "Country file"],
            ].map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} className={`tabs__tab ${tab === key ? "tabs__tab--active" : ""}`} onClick={() => setTab(key)}>
                {label}
              </button>
            ))}
          </div>
          {tab === "institutions" && <InstitutionsList onEdit={setEditing} />}
          {tab === "refusals" && <Refusals />}
          {tab === "geoip" && <CountryFile />}
        </>
      )}
    </div>
  );
}

function InstitutionsList({ onEdit }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    accessService
      .list()
      .then(setRows)
      .catch((e) => {
        setError(errorOf(e));
        setRows([]);
      });
  }, []);
  const of = (row, code) => (row.portals ?? []).find((p) => p.portal === code);
  return (
    <DataTable
      isLoading={!rows}
      error={error}
      rows={rows ?? []}
      emptyMessage="No institutions."
      columns={[
        {
          key: "inst_profile_name",
          label: "Institution",
          render: (r) => (
            <button type="button" className="acc__link" onClick={() => onEdit(r.inst_profile_id)}>
              <strong>{r.inst_profile_name}</strong>
              <span className="acc__muted"> {r.inst_code}</span>
            </button>
          ),
        },
        ...PORTALS.map(([code, label]) => ({ key: code, label: label.replace(" portal", ""), render: (r) => <PolicyCell policy={of(r, code)} /> })),
      ]}
      actions={(r) => (
        <Button size="sm" variant="secondary" onClick={() => onEdit(r.inst_profile_id)}>
          Edit
        </Button>
      )}
    />
  );
}

function InstitutionPolicy({ instProfileId, onBack }) {
  const [inst, setInst] = useState(null);
  const [countries, setCountries] = useState([]);
  const [error, setError] = useState("");
  const load = useCallback(() => accessService.get(instProfileId).then(setInst).catch((e) => setError(errorOf(e))), [instProfileId]);
  useEffect(() => {
    load();
    accessService
      .countries()
      .then(setCountries)
      .catch(() => setCountries([]));
  }, [load]);
  return (
    <div className="acc__stack">
      <div className="acc__bar">
        <Button variant="ghost" onClick={onBack}>
          ← All institutions
        </Button>
        {inst && (
          <h2 className="acc__title">
            {inst.inst_profile_name} <span className="acc__muted">{inst.inst_code}</span>
          </h2>
        )}
      </div>
      {error && <Alert>{error}</Alert>}
      <TestAddress instProfileId={instProfileId} />
      {inst && (
        <div className="acc__grid">
          {PORTALS.map(([code]) => (
            // A saved policy comes back with a new time: the card starts again from it.
            <PortalCard
              key={`${code}:${(inst.portals ?? []).find((p) => p.portal === code)?.updated_time ?? ""}`}
              instProfileId={instProfileId}
              policy={(inst.portals ?? []).find((p) => p.portal === code) ?? { portal: code, mode: "OPEN" }} countries={countries} onSaved={setInst} />
          ))}
        </div>
      )}
    </div>
  );
}

const linesOf = (text) =>
  String(text ?? "")
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

// One portal's policy, saved on its own (the whole policy each time).
function PortalCard({ instProfileId, policy, countries, onSaved }) {
  const initial = useMemo(
    () => ({
      mode: policy.mode ?? "OPEN",
      allowed: (policy.allowed_countries ?? []).map((c) => c.code),
      allowedIps: (policy.allowed_ips ?? []).join("\n"),
      blockedIps: (policy.blocked_ips ?? []).join("\n"),
      note: policy.note ?? "",
    }),
    [policy],
  );
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const restricted = form.mode === "RESTRICTED";
  const invalid = restricted && !form.allowed.length && !linesOf(form.allowedIps).length;

  const save = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const saved = await accessService.save({
        inst_profile_id: instProfileId,
        portal: policy.portal,
        mode: form.mode,
        allowed_countries: form.allowed,
        allowed_ips: linesOf(form.allowedIps),
        blocked_ips: linesOf(form.blockedIps),
        note: form.note.trim(),
      });
      onSaved(saved);
      setMessage({ tone: "success", text: "Saved. It applies within 30 seconds." });
    } catch (e) {
      setMessage({ tone: "danger", text: errorOf(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={portalLabel(policy.portal)} subtitle={policy.updated_time ? `Changed ${when(policy.updated_time)} by ${policy.updated_by ?? "—"}` : "Never set: open to everyone"}>
      <div className="acc__stack">
        <div className="acc__seg" role="radiogroup" aria-label="Mode">
          {[
            ["OPEN", "Open", "Anyone, except blocked IPs"],
            ["RESTRICTED", "Restricted", "Only the countries and IPs below"],
          ].map(([value, label, hint]) => (
            <button key={value} type="button" role="radio" aria-checked={form.mode === value} className={`acc__seg-btn ${form.mode === value ? "acc__seg-btn--on" : ""}`} onClick={() => setForm((f) => ({ ...f, mode: value }))}>
              <strong>{label}</strong>
              <span>{hint}</span>
            </button>
          ))}
        </div>
        {restricted && <CountryPicker countries={countries} value={form.allowed} onChange={(allowed) => setForm((f) => ({ ...f, allowed }))} />}
        {restricted && (
          <label className="acc__field">
            <span className="tf__label">Allowed IPs (from any country)</span>
            <textarea className="tf__input acc__area" value={form.allowedIps} onChange={(e) => setForm((f) => ({ ...f, allowedIps: e.target.value }))} placeholder={"203.0.113.10\n198.51.100.0/24"} />
            <span className="tf__hint">One per line: an office line or a VPN abroad. Ranges like 10.0.0.0/8 and IPv6 work.</span>
          </label>
        )}
        <label className="acc__field">
          <span className="tf__label">Blocked IPs (refused in both modes)</span>
          <textarea className="tf__input acc__area" value={form.blockedIps} onChange={(e) => setForm((f) => ({ ...f, blockedIps: e.target.value }))} placeholder="One per line" />
        </label>
        <TextField label="Note" value={form.note} maxLength={255} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Why, for whoever changes it next" />
        {invalid && <Alert tone="warning">Restricted needs at least one allowed country or IP.</Alert>}
        {message && <Alert tone={message.tone}>{message.text}</Alert>}
        <div className="acc__actions">
          {dirty && (
            <Button variant="ghost" onClick={() => setForm(initial)} disabled={busy}>
              Undo changes
            </Button>
          )}
          <Button onClick={save} loading={busy} disabled={!dirty || invalid}>
            Save {portalLabel(policy.portal).toLowerCase()}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Countries as chips, with a search to add more.
function CountryPicker({ countries, value, onChange }) {
  const [query, setQuery] = useState("");
  const name = (code) => countries.find((c) => c.code === code)?.name ?? code;
  const q = query.trim().toLowerCase();
  const matches = q ? countries.filter((c) => !value.includes(c.code) && (c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q)).slice(0, 8) : [];
  return (
    <div className="acc__field">
      <span className="tf__label">Allowed countries</span>
      <div className="acc__chips">
        {value.length === 0 && <span className="acc__muted">None yet</span>}
        {value.map((code) => (
          <button key={code} type="button" className="acc__chip" onClick={() => onChange(value.filter((c) => c !== code))} title="Remove">
            {name(code)} <span className="acc__muted">{code}</span> ×
          </button>
        ))}
      </div>
      <input className="tf__input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type a country to add it" aria-label="Add a country" />
      {matches.length > 0 && (
        <ul className="acc__options">
          {matches.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                onClick={() => {
                  onChange([...value, c.code]);
                  setQuery("");
                }}
              >
                {c.name} <span className="acc__muted">{c.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Tests an address against the saved policy (records nothing). Empty: my own.
function TestAddress({ instProfileId }) {
  const [form, setForm] = useState({ portal: "ADMIN", ip: "" });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      setResult(await accessService.check({ inst_profile_id: instProfileId, portal: form.portal, ip: form.ip.trim() }));
    } catch (err) {
      setResult({ error: errorOf(err) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title="Test an address" subtitle="Checks an IP against the saved policy. Leave the IP empty to test your own address.">
      <form className="acc__test" onSubmit={run}>
        <Select label="Portal" value={form.portal} onChange={(e) => setForm((f) => ({ ...f, portal: e.target.value }))} options={PORTALS.map(([value, label]) => ({ value, label }))} />
        <TextField label="IP address" value={form.ip} onChange={(e) => setForm((f) => ({ ...f, ip: e.target.value }))} placeholder="My own address" />
        <Button type="submit" loading={busy}>
          Test
        </Button>
      </form>
      {result?.error && <Alert>{result.error}</Alert>}
      {result && !result.error && (
        <Alert tone={result.allowed ? "success" : "danger"}>
          <strong>{result.allowed ? "Allowed" : `Refused: ${reasonLabel(result.reason)}`}</strong> · {result.ip || "—"} · {result.country_name || result.country || "country unknown"} · {result.rule}
        </Alert>
      )}
    </Card>
  );
}

function Refusals() {
  const [filters, setFilters] = useState({ portal: "", reason: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setData(null);
    accessService
      .refusals({ ...(filters.portal ? { portal: filters.portal } : {}), ...(filters.reason ? { reason: filters.reason } : {}), page, limit: 50 })
      .then((d) => live && setData(d))
      .catch((e) => {
        if (!live) return;
        setError(errorOf(e));
        setData({ items: [], total: 0 });
      });
    return () => {
      live = false;
    };
  }, [filters, page]);
  const set = (key) => (e) => {
    setFilters((f) => ({ ...f, [key]: e.target.value }));
    setPage(1);
  };
  return (
    <div className="acc__stack">
      <div className="acc__filters">
        <Select aria-label="Portal" value={filters.portal} onChange={set("portal")} options={[{ value: "", label: "Any portal" }, ...PORTALS.map(([value, label]) => ({ value, label }))]} />
        <Select aria-label="Reason" value={filters.reason} onChange={set("reason")} options={REASONS.map(([value, label]) => ({ value, label }))} />
      </div>
      <DataTable
        isLoading={!data}
        error={error}
        rows={data?.items ?? []}
        emptyMessage="No refused requests."
        page={page}
        onPageChange={setPage}
        pagination={{ totalRecords: data?.total ?? 0, totalPages: Math.max(1, Math.ceil((data?.total ?? 0) / 50)), limit: 50 }}
        columns={[
          { key: "occurred_at", label: "When", render: (r) => <span className="acc__nowrap">{when(r.occurred_at)}{r.repeats > 1 && <span className="acc__muted"> ×{r.repeats} to {when(r.last_at)}</span>}</span> },
          { key: "inst_profile_name", label: "Institution" },
          { key: "portal", label: "Portal", render: (r) => portalLabel(r.portal) },
          { key: "ip", label: "IP", render: (r) => <code>{r.ip}</code> },
          { key: "country", label: "Country", render: (r) => r.country || "Unknown" },
          { key: "reason", label: "Reason", render: (r) => reasonLabel(r.reason) },
          { key: "api", label: "Call", render: (r) => <code className="acc__muted">{r.api}</code> },
        ]}
      />
    </div>
  );
}

function CountryFile() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    accessService
      .geoip()
      .then(setFile)
      .catch((e) => setError(errorOf(e)));
  }, []);
  const update = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      setFile(await accessService.geoipUpdate());
      setMessage("Updated. Every service uses the new file within a minute.");
    } catch (e) {
      setError(`${errorOf(e)} The previous file stays in use.`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card
      title="Country file"
      subtitle="Which country an IP address belongs to. DB-IP publishes a new file each month; update it once a month."
      actions={
        <Button onClick={update} loading={busy}>
          Update now
        </Button>
      }
    >
      <div className="acc__stack">
        {file && !file.loaded && <Alert tone="warning">No country file is loaded: every country is unknown, so restricted portals let in only their allowed IPs.</Alert>}
        {error && <Alert>{error}</Alert>}
        {message && <Alert tone="success">{message}</Alert>}
        {file && (
          <dl className="acc__facts">
            <div>
              <dt>Built</dt>
              <dd>{when(file.built_at)}</dd>
            </div>
            <div>
              <dt>Installed</dt>
              <dd>{when(file.file_time)}</dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>{file.size_bytes ? `${(file.size_bytes / 1048576).toFixed(1)} MB` : "—"}</dd>
            </div>
            <div>
              <dt>File</dt>
              <dd>
                <code>{file.file}</code>
              </dd>
            </div>
          </dl>
        )}
        <p className="acc__muted">
          IP geolocation by{" "}
          <a href="https://db-ip.com" target="_blank" rel="noreferrer">
            DB-IP
          </a>
          .
        </p>
      </div>
    </Card>
  );
}
