import { useEffect, useState } from "react";
import { expiryService } from "../services/expiryService";
import { systemService } from "../../system/services/systemService";
import { rowLabel, rowValue } from "../../../lib/rowLabel";
import { Button } from "../../../components/ui/Button";
import { DataTable } from "../../../components/ui/DataTable";
import { Select } from "../../../components/ui/Select";
import { TableSearchBar } from "../../../components/ui/TableSearchBar";
import { TextField } from "../../../components/ui/TextField";
import "../../masterData/components/MasterDataPage.css";
import "../../aml/components/Aml.css";
import "../../security/components/SecurityEvents.css";

const LIMIT = 50;
// State: VALID grey, EXPIRING amber, IN_GRACE / EXPIRED red (the DataTable pill tones).
const STATES = [
  ["EXPIRING", "Expiring", "pending"],
  ["IN_GRACE", "In grace", "rejected"],
  ["EXPIRED", "Expired", "rejected"],
  ["VALID", "Valid", "inactive"],
];
const STATE = Object.fromEntries(STATES.map(([value, label, tone]) => [value, { label, tone }]));
const PARTIES = [
  ["CUST_INDV", "Customer, individual"],
  ["CUST_CORP", "Customer, company"],
  ["MERCH_INDV", "Merchant, individual"],
  ["MERCH_CORP", "Merchant, company"],
];
const PARTY = Object.fromEntries(PARTIES);
const EMPTY = { tab: "", inst_profile_id: "", party: "", within_days: "", search: "" };

const daysLeft = (d) => (d == null ? "" : d > 0 ? `in ${d} day${d === 1 ? "" : "s"}` : d === 0 ? "today" : `${-d} day${d === -1 ? "" : "s"} ago`);

// Customers' and merchants' documents across every institution, by how close
// they are to expiry: expiring soon, in grace (past the date, before the
// institution's action), expired (the action taken, money maybe held).
export function ExpiringDocumentsPage() {
  const [filters, setFilters] = useState(EMPTY);
  // The search box waits 400 ms after typing stops.
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [institutions, setInstitutions] = useState([]);
  const filterBy = (change) => {
    setFilters(change);
    setPage(1);
  };

  useEffect(() => {
    systemService.listActiveInstitutions().then(setInstitutions).catch(() => setInstitutions([]));
  }, []);

  useEffect(() => {
    if (search === filters.search) return undefined;
    const timer = setTimeout(() => filterBy((f) => ({ ...f, search })), 400);
    return () => clearTimeout(timer);
  }, [search, filters.search]);

  useEffect(() => {
    let cancelled = false;
    const { tab, search: text, ...rest } = filters;
    const listFilters = Object.fromEntries(
      Object.entries(rest)
        .filter(([, v]) => v !== "")
        .map(([k, v]) => [k, k === "party" ? v : Number(v)]),
    );
    expiryService
      .listDocuments({ tab: tab || "all", search: text, filters: listFilters, page, limit: LIMIT })
      .then((data) => !cancelled && (setResult(data), setError(null)))
      .catch((err) => !cancelled && (setResult((prev) => prev ?? { rows: [], pagination: null }), setError(err.message)));
    return () => {
      cancelled = true;
    };
  }, [filters, page]);

  const set = (key) => (e) => filterBy((f) => ({ ...f, [key]: e.target.value }));
  const filtered = Object.values(filters).some(Boolean);

  const columns = [
    { key: "inst_profile_name", label: "Institution", render: (r) => r.inst_profile_name || "—" },
    {
      key: "party_name",
      label: "Customer or merchant",
      render: (r) => (
        <span>
          <b>{r.party_name || "—"}</b>
          <span className="aml__note" style={{ display: "block" }}>
            {PARTY[r.subject_type] ?? r.subject_type}
          </span>
        </span>
      ),
    },
    {
      key: "label",
      label: "Document",
      render: (r) => (
        <span>
          {r.label}
          <span className="aml__mono aml__note" style={{ display: "block" }}>
            {r.reference || "—"}
          </span>
        </span>
      ),
    },
    {
      key: "expires_on",
      label: "Expires on",
      render: (r) => (
        <span className="sec__nowrap">
          {String(r.expires_on ?? "").slice(0, 10) || "—"}
          <span className="aml__note" style={{ display: "block" }}>
            {daysLeft(r.days_left)}
          </span>
        </span>
      ),
    },
    {
      key: "state",
      label: "State",
      render: (r) => (
        <span>
          <span className={`dt__status dt__status--${STATE[r.state]?.tone ?? "inactive"}`}>{STATE[r.state]?.label ?? r.state}</span>
          {r.holds?.length > 0 && (
            <span className="aml__note" style={{ display: "block", color: "#b91c1c", fontWeight: 700 }}>
              Money held
            </span>
          )}
        </span>
      ),
    },
    { key: "action_taken", label: "Action taken", render: (r) => <span className="aml__mono">{r.action_taken || "—"}</span> },
  ];

  const pagination = result?.pagination;
  return (
    <div className="mdp">
      <div className="mdp__header">
        <div>
          <span className="mdp__eyebrow">Expiry</span>
          <h1 className="mdp__title">Expiring Documents</h1>
          <p className="mdp__subtitle">
            Customers&apos; and merchants&apos; documents in every institution, by how close they are to expiry. A renewed document leaves the list and its hold is lifted.
          </p>
        </div>
      </div>

      {error && <div className="mdp__error">{error}</div>}

      <div className="sec__filters">
        <TableSearchBar value={search} onChange={setSearch} placeholder="Search name, reference or document…" />
        <Select label="Institution" placeholder="All institutions" value={filters.inst_profile_id} onChange={set("inst_profile_id")} options={institutions.map((row) => ({ value: String(rowValue(row)), label: rowLabel(row) }))} />
        <Select label="State" placeholder="All" value={filters.tab} onChange={set("tab")} options={STATES.map(([value, label]) => ({ value, label }))} />
        <Select label="Party" placeholder="Any" value={filters.party} onChange={set("party")} options={PARTIES.map(([value, label]) => ({ value, label }))} />
        <TextField label="Expiring within (days)" type="number" min={0} value={filters.within_days} onChange={set("within_days")} />
        {filtered && (
          <Button
            variant="secondary"
            onClick={() => {
              setSearch("");
              filterBy(EMPTY);
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={result?.rows}
        isLoading={result === null}
        emptyMessage={filtered ? "No documents match these filters." : "No watched documents yet."}
        page={page}
        onPageChange={setPage}
        pagination={pagination ?? { totalRecords: 0, totalPages: 0, currentPage: page, limit: LIMIT }}
      />
    </div>
  );
}
