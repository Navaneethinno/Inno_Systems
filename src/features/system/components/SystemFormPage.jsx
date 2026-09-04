import { useState } from "react";
import { useParams } from "react-router-dom";
import { systemForms } from "../config/systemForms";
import { systemService } from "../services/systemService";
import { TextField } from "../../../components/ui/TextField";
import { Button } from "../../../components/ui/Button";
import "../../masterData/components/MasterDataPage.css";
import "./SystemFormPage.css";

const emptyValues = (fields) =>
  Object.fromEntries(fields.map((f) => [f.name, f.type === "status" ? false : ""]));

export function SystemFormPage() {
  const { formKey } = useParams();
  const config = systemForms[formKey];

  const [values, setValues] = useState(() => (config ? emptyValues(config.fields) : {}));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (!config) {
    return <div className="mdp__state">Unknown form "{formKey}".</div>;
  }

  const handleChange = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = { ...values };
      config.fields.forEach((f) => {
        if (f.type === "number") payload[f.name] = Number(payload[f.name]) || 0;
        if (f.type === "status") payload[f.name] = payload[f.name] ? 1 : 0;
      });
      const result = await systemService[config.serviceMethod](payload);
      setSuccess(`${config.label} created (id: ${result?.id ?? "—"}).`);
      setValues(emptyValues(config.fields));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mdp">
      <div className="mdp__header">
        <div>
          <h1 className="mdp__title">Add {config.label}</h1>
          <p className="mdp__subtitle">Creates a new {config.label.toLowerCase()} via the system API.</p>
        </div>
      </div>

      <div className="sfp__warning">
        This form's fields are inferred, not confirmed by the backend — verify them before relying on this in
        production. See <code>systemService.js</code>.
      </div>

      {error && <div className="mdp__error">{error}</div>}
      {success && <div className="sfp__success">{success}</div>}

      <form className="sfp__form" onSubmit={handleSubmit}>
        {config.fields.map((field) =>
          field.type === "status" ? (
            <label key={field.name} className="mdp__checkbox">
              <input
                type="checkbox"
                checked={Boolean(values[field.name])}
                onChange={(e) => handleChange(field.name, e.target.checked)}
              />
              <span>{field.label}</span>
            </label>
          ) : (
            <TextField
              key={field.name}
              label={field.label}
              type={field.type === "number" ? "number" : field.type === "password" ? "password" : "text"}
              icon={field.type === "password" ? "lock" : undefined}
              required={field.required}
              value={values[field.name] ?? ""}
              onChange={(e) => handleChange(field.name, e.target.value)}
            />
          )
        )}

        <Button type="submit" loading={isSaving} className="sfp__submit">
          Create {config.label}
        </Button>
      </form>
    </div>
  );
}
