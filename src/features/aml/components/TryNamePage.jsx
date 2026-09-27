import { useState } from "react";
import { amlService } from "../services/amlService";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { DataTable } from "../../../components/ui/DataTable";
import { Select } from "../../../components/ui/Select";
import { TextField } from "../../../components/ui/TextField";
import "../../masterData/components/MasterDataPage.css";
import "./Aml.css";

// Why a match's score differs from its name score. The same adjustments
// appear on the institution screens (admin portal), labelled the same way.
const ADJUSTMENTS = {
  DOB_EXACT: "Same date of birth",
  DOB_YEAR: "Same birth year",
  DOB_CONFLICT: "Different date of birth",
  COUNTRY_MATCH: "Country matches",
  COUNTRY_DIFFER: "Country differs",
  GENDER_DIFFER: "Gender differs",
};

const EMPTY = { name: "", entity_type: "", birth_date: "", countries: "", gender: "", min_score: "50", limit: "50", exact: false };

const scoreClass = (score) => (score >= 85 ? "aml__score--high" : score >= 60 ? "aml__score--mid" : "aml__score--low");
const join = (list) => (list?.length ? list.join(", ") : "—");

function AdjustmentChips({ adjustments }) {
  if (!adjustments?.length) return null;
  return (
    <div className="aml__chips">
      {adjustments.map((a) => (
        <span key={a.reason} className={`aml__chip ${a.points >= 0 ? "aml__chip--plus" : "aml__chip--minus"}`}>
          {ADJUSTMENTS[a.reason] ?? a.reason} {a.points > 0 ? `+${a.points}` : a.points}
        </span>
      ))}
    </div>
  );
}

// The listed record behind a match; many fields may be empty.
function EntityModal({ match, onClose }) {
  const e = match.entity ?? {};
  const rows = [
    ["ID", e.id],
    ["List", [e.list, e.category].filter(Boolean).join(" · ")],
    ["Type", e.entity_type],
    ["Aliases", join(e.aliases)],
    ["Gender", e.gender],
    ["Birth dates", join(e.birth_dates?.length ? e.birth_dates : e.birth_years)],
    ["Nationalities", join(e.nationalities)],
    ["Countries", join(e.countries)],
    ["Identifiers", join(e.identifiers?.map((i) => `${i.type ?? ""} ${i.number ?? ""}`.trim()))],
    ["Programmes", join(e.programs)],
    ["Listed on", e.listed_on],
    ["Remarks", Array.isArray(e.remarks) ? e.remarks.join("; ") : e.remarks],
    ["Index", match.index],
  ].filter(([, v]) => v && v !== "—");
  return (
    <Modal title={e.name ?? match.matched_name} onClose={onClose} width={720}>
      <dl className="aml__record">
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: "contents" }}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {e.source_url && (
        <p className="aml__note" style={{ marginTop: 14 }}>
          <a href={e.source_url} target="_blank" rel="noreferrer">
            Open on the publisher's site ↗
          </a>
        </p>
      )}
    </Modal>
  );
}

/**
 * AML > Try a Name (02_System_AML_Try_A_Name.md): screen any name against
 * the switched-on platform watchlists and see why each match scored what it
 * did. Nothing is stored, and institutions' own lists aren't searched.
 */
export function TryNamePage() {
  const [form, setForm] = useState(EMPTY);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [openMatch, setOpenMatch] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const run = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    const countries = form.countries
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    const payload = {
      name: form.name.trim(),
      ...(form.entity_type ? { entity_type: form.entity_type } : {}),
      ...(form.birth_date.trim() ? { birth_date: form.birth_date.trim() } : {}),
      ...(countries.length ? { countries } : {}),
      ...(form.gender ? { gender: form.gender } : {}),
      ...(form.min_score !== "" ? { min_score: Number(form.min_score) } : {}),
      ...(form.limit !== "" ? { limit: Number(form.limit) } : {}),
      exact: form.exact,
    };
    setIsRunning(true);
    setError(null);
    try {
      setResult(await amlService.screenTest(payload));
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setIsRunning(false);
    }
  };

  const columns = [
    {
      key: "score",
      label: "Score",
      narrow: true,
      render: (m) => (
        <>
          <span className={`aml__score ${scoreClass(m.score)}`}>{m.score}</span>
          <span className="aml__sub">name {m.name_score}</span>
        </>
      ),
    },
    {
      key: "matched_name",
      label: "Matched name",
      render: (m) => (
        <>
          <span className="aml__name">{m.matched_name}</span>
          {m.entity?.name && m.entity.name !== m.matched_name && <span className="aml__sub">{m.entity.name}</span>}
          <AdjustmentChips adjustments={m.adjustments} />
        </>
      ),
    },
    {
      key: "list",
      label: "List",
      render: (m) => (
        <>
          <span className="aml__mono">{m.entity?.list ?? "—"}</span>
          <span className="aml__sub">{m.entity?.category}</span>
        </>
      ),
    },
    { key: "entity_type", label: "Type", render: (m) => m.entity?.entity_type ?? "—" },
    { key: "birth", label: "Birth dates", sortable: false, render: (m) => join(m.entity?.birth_dates?.length ? m.entity.birth_dates : m.entity?.birth_years) },
    { key: "countries", label: "Countries", sortable: false, render: (m) => join(m.entity?.countries) },
  ];

  // Flatten for DataTable's sort on nested values.
  const rows = result?.matches?.map((m, i) => ({ ...m, id: `${m.entity?.id ?? m.matched_name}-${i}`, list: m.entity?.list ?? "", entity_type: m.entity?.entity_type ?? "" }));

  return (
    <div className="mdp">
      <div className="mdp__header">
        <div>
          <span className="mdp__eyebrow">AML</span>
          <h1 className="mdp__title">Try a Name</h1>
          <p className="mdp__subtitle">
            Screen any name against the switched-on platform watchlists. Nothing is stored; institutions' own lists aren't searched.
          </p>
        </div>
      </div>

      <form className="aml__form" onSubmit={run} noValidate>
        <div className="aml__form-wide">
          <TextField id="aml-name" label="Name *" value={form.name} onChange={set("name")} placeholder="Vladimir Putin" />
        </div>
        <Select
          id="aml-type"
          label="Entity type"
          value={form.entity_type}
          onChange={set("entity_type")}
          options={[
            { value: "", label: "Either" },
            { value: "PERSON", label: "Person" },
            { value: "ORGANIZATION", label: "Organisation" },
          ]}
        />
        <TextField id="aml-dob" label="Birth date" value={form.birth_date} onChange={set("birth_date")} placeholder="1952-10-07, 1952-10 or 1952" />
        <TextField id="aml-countries" label="Countries" value={form.countries} onChange={set("countries")} placeholder="Russia, RU" />
        <Select
          id="aml-gender"
          label="Gender"
          value={form.gender}
          onChange={set("gender")}
          options={[
            { value: "", label: "Any" },
            { value: "M", label: "Male" },
            { value: "F", label: "Female" },
          ]}
        />
        <TextField id="aml-min" type="number" label="Minimum score (0–100)" value={form.min_score} onChange={set("min_score")} max={100} />
        <TextField id="aml-limit" type="number" label="Most matches" value={form.limit} onChange={set("limit")} />
        <div className="aml__form-actions">
          <label className="aml__check">
            <input type="checkbox" checked={form.exact} onChange={set("exact")} />
            Exact names only (word for word)
          </label>
          <Button type="submit" loading={isRunning}>
            Screen name
          </Button>
        </div>
      </form>

      {error && <div className="mdp__error">{error}</div>}

      {result && (
        <>
          <div className="aml__summary">
            <span className={`aml__score aml__score--big ${scoreClass(result.score)}`}>{result.score}</span>
            <span className="aml__note">
              best score · {result.matches?.length ?? 0} match{result.matches?.length === 1 ? "" : "es"} · {result.took_ms} ms
            </span>
            <span className="aml__note">
              Screened as: {[result.subject?.name, result.subject?.entity_type, result.subject?.birth_date, join(result.subject?.countries)].filter((v) => v && v !== "—").join(" · ")}
            </span>
          </div>
          {result.searched?.length > 0 && (
            <p className="aml__note" style={{ marginBottom: 12 }}>
              Searched: <span className="aml__mono">{result.searched.join(", ")}</span>
            </p>
          )}
          <DataTable
            columns={columns}
            rows={rows}
            isLoading={false}
            emptyMessage="No matches above the minimum score."
            actions={(m) => (
              <button type="button" className="aml__text-btn" onClick={() => setOpenMatch(m)}>
                Record
              </button>
            )}
          />
        </>
      )}

      {openMatch && <EntityModal match={openMatch} onClose={() => setOpenMatch(null)} />}
    </div>
  );
}
