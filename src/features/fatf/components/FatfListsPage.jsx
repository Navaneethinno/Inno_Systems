import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { DataTable } from "../../../components/ui/DataTable";
import { Modal } from "../../../components/ui/Modal";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Select } from "../../../components/ui/Select";
import { StatusFilterTabs } from "../../../components/ui/StatusFilterTabs";
import { TonePill } from "../../../components/ui/StatusBadge";
import { TextField } from "../../../components/ui/TextField";
import { fatfService } from "../services/fatfService";

const LISTS = [
  { value: "GREY", label: "Grey" },
  { value: "BLACK", label: "Black" },
];
const errorOf = (err) => err?.response?.data?.message ?? err?.message ?? "Something went wrong.";

function CountryForm({ row, rows, countries, onClose, onSaved }) {
  const [form, setForm] = useState({
    country_id: row?.country_id != null ? String(row.country_id) : "",
    list_code: row?.list_code ?? "",
    listed_on: row?.listed_on ?? "",
    source: row?.source ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  // A country can be on one list only.
  const taken = new Set(rows.filter((r) => r.id !== row?.id).map((r) => String(r.country_id)));
  const options = countries.filter((c) => !taken.has(String(c.id))).map((c) => ({ value: String(c.id), label: c.name }));
  // Why Save is off, shown beside it.
  const missing = !form.country_id ? "Pick a country." : !form.list_code ? "Pick a list." : null;
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = { country_id: Number(form.country_id), list_code: form.list_code, source: form.source.trim(), ...(form.listed_on && { listed_on: form.listed_on }) };
      await (row ? fatfService.edit({ id: row.id, ...body }) : fatfService.add(body));
      onSaved();
    } catch (err) {
      setError(errorOf(err));
      setBusy(false);
    }
  };
  return (
    <Modal
      title={row ? `Edit ${row.country_name}` : "Add country"}
      onClose={onClose}
      footer={
        <>
          {missing && <span className="muted">{missing}</span>}
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} disabled={Boolean(missing) || busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      {error && <Alert>{error}</Alert>}
      <Select id="fatf-country" label="Country *" placeholder="Select a country" value={form.country_id} onChange={set("country_id")} options={options} />
      <Select id="fatf-list" label="List *" placeholder="Select a list" value={form.list_code} onChange={set("list_code")} options={LISTS} />
      <TextField id="fatf-listed-on" label="Listed on" type="date" value={form.listed_on} onChange={set("listed_on")} hint={row ? undefined : "Today, if left empty."} />
      <TextField id="fatf-source" label="Source" value={form.source} onChange={set("source")} placeholder="FATF plenary, 28-30 October 2026" />
    </Modal>
  );
}

// PLATFORM > Master Data > FATF lists: the countries the FATF risk criterion
// scores. System updates them after each plenary.
export function FatfListsPage() {
  const [rows, setRows] = useState(null);
  const [countries, setCountries] = useState([]);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [removeError, setRemoveError] = useState(null);

  const load = useCallback(() => {
    fatfService
      .list()
      .then((list) => {
        setRows(list);
        setError(null);
      })
      .catch((err) => setError(errorOf(err)));
  }, []);
  useEffect(() => {
    load();
    fatfService.countries().then(setCountries).catch((err) => setError(errorOf(err)));
  }, [load]);

  const counts = useMemo(() => {
    const all = rows ?? [];
    return { all: all.length, grey: all.filter((r) => r.list_code === "GREY").length, black: all.filter((r) => r.list_code === "BLACK").length };
  }, [rows]);
  const shown = rows && (filter === "all" ? rows : rows.filter((r) => r.list_code === filter.toUpperCase()));

  const remove = async () => {
    setBusy(true);
    setRemoveError(null);
    try {
      await fatfService.remove(removing.id);
      setRemoving(null);
      load();
    } catch (err) {
      setRemoveError(errorOf(err));
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: "country_name", label: "Country", render: (r) => <b>{r.country_name}</b> },
    { key: "list_code", label: "List", render: (r) => <TonePill tone={r.list_code === "BLACK" ? "rejected" : "pending"}>{r.list_name ?? r.list_code}</TonePill> },
    { key: "listed_on", label: "Listed on", render: (r) => <span className="nowrap">{r.listed_on || "—"}</span> },
    { key: "source", label: "Source", render: (r) => <span style={{ display: "block", minWidth: 120, maxWidth: 170, whiteSpace: "normal" }}>{r.source || "—"}</span> },
    { key: "updated_by", label: "Updated by", render: (r) => r.updated_by || "—" },
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow="Master Data"
        title="FATF lists"
        subtitle="Update after each FATF plenary (February, June, October). Changes apply to new risk assessments."
        actions={<Button onClick={() => setEditing({})}>Add country</Button>}
      />
      <StatusFilterTabs filter={filter} onChange={setFilter} counts={counts} />
      <DataTable
        columns={columns}
        rows={shown}
        isLoading={!rows && !error}
        error={error}
        emptyMessage="No country is on this list."
        actions={(r) => (
          <>
            <Button size="sm" variant="secondary" onClick={() => setEditing(r)}>
              Edit
            </Button>{" "}
            <Button size="sm" variant="secondary" onClick={() => setRemoving(r)}>
              Remove
            </Button>
          </>
        )}
      />
      {editing && (
        <CountryForm
          row={editing.id ? editing : null}
          rows={rows ?? []}
          countries={countries}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {removing && (
        <Modal
          title="Remove from the FATF lists"
          onClose={() => setRemoving(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setRemoving(null)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={remove} disabled={busy}>
                {busy ? "Removing…" : "Remove"}
              </Button>
            </>
          }
        >
          {removeError && <Alert>{removeError}</Alert>}
          <p>Remove {removing.country_name} from the FATF lists? Customers from it will no longer score on the FATF risk criterion.</p>
        </Modal>
      )}
    </div>
  );
}
