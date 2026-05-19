import { ArrowLeft, PencilLine, RefreshCw, Settings2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { useCurrentUser } from "../context/currentUser";
import {
  createLookup,
  deleteLookup,
  listLookup,
  updateLookup,
} from "../api/lookups";

const CATALOGS = {
  statuses: {
    label: "Statuses",
    singular: "status",
    resource: "statuses",
    description: "Workflow states that define where an issue is in the process.",
    accent: "#0d8aa8",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, placeholder: "Open" },
      { name: "color", label: "Color", type: "color", required: true },
      { name: "is_closed", label: "Closed status", type: "checkbox" },
    ],
    defaultValues: { name: "", color: "#0d8aa8", is_closed: false },
  },
  types: {
    label: "Types",
    singular: "type",
    resource: "types",
    description: "Issue categories used to group similar work.",
    accent: "#6c5ce7",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, placeholder: "Bug" },
      { name: "color", label: "Color", type: "color", required: true },
    ],
    defaultValues: { name: "", color: "#6c5ce7" },
  },
  priorities: {
    label: "Priorities",
    singular: "priority",
    resource: "priorities",
    description: "Urgency levels that help the team decide what to tackle first.",
    accent: "#e17055",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, placeholder: "High" },
      { name: "color", label: "Color", type: "color", required: true },
    ],
    defaultValues: { name: "", color: "#e17055" },
  },
  severities: {
    label: "Severities",
    singular: "severity",
    resource: "severities",
    description: "Impact levels that describe how serious an issue is.",
    accent: "#f39c12",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, placeholder: "Critical" },
      { name: "color", label: "Color", type: "color", required: true },
    ],
    defaultValues: { name: "", color: "#f39c12" },
  },
  tags: {
    label: "Tags",
    singular: "tag",
    resource: "tags",
    description: "Free-form labels that can be attached to one or many issues.",
    accent: "#c084fc",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, placeholder: "frontend" },
      { name: "color", label: "Color", type: "color", required: true },
    ],
    defaultValues: { name: "", color: "#c084fc" },
  },
  dueDates: {
    label: "Due date statuses",
    singular: "due date status",
    resource: "due-dates",
    description: "Buckets for deadlines, such as items due before or after a target date.",
    accent: "#647084",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, placeholder: "Due soon" },
      { name: "color", label: "Color", type: "color", required: true },
      {
        name: "days_to_due_date",
        label: "Days to due date",
        type: "number",
        required: true,
        placeholder: "3",
      },
      {
        name: "before_after",
        label: "Timing",
        type: "select",
        required: true,
        options: [
          { value: "before", label: "Before" },
          { value: "after", label: "After" },
        ],
      },
    ],
    defaultValues: {
      name: "",
      color: "#647084",
      days_to_due_date: "",
      before_after: "before",
    },
  },
};

const CATALOG_ORDER = Object.keys(CATALOGS);

function getResults(payload) {
  return Array.isArray(payload?.results) ? payload.results : Array.isArray(payload) ? payload : [];
}

function getErrorMessage(error, fallback) {
  if (error?.details?.detail) return String(error.details.detail);

  if (error?.details && typeof error.details === "object") {
    const firstEntry = Object.entries(error.details)[0];
    if (firstEntry) {
      const [field, messages] = firstEntry;
      const message = Array.isArray(messages) ? messages[0] : messages;
      return `${field}: ${message}`;
    }
  }

  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function createEmptyCatalogState() {
  return Object.fromEntries(CATALOG_ORDER.map((key) => [key, []]));
}

function cloneDefaultValues(catalog) {
  return { ...catalog.defaultValues };
}

function itemToFormValues(catalog, item) {
  return catalog.fields.reduce((values, field) => {
    if (field.type === "checkbox") {
      values[field.name] = Boolean(item?.[field.name]);
      return values;
    }

    values[field.name] = item?.[field.name] ?? catalog.defaultValues[field.name] ?? "";
    return values;
  }, {});
}

function serializeFormValues(catalog, values) {
  const payload = {};

  for (const field of catalog.fields) {
    const value = values[field.name];

    if (field.type === "checkbox") {
      payload[field.name] = Boolean(value);
      continue;
    }

    if (field.type === "number") {
      const parsedValue = Number(value);
      if (!Number.isInteger(parsedValue)) {
        return { error: `${field.label} must be a whole number.` };
      }

      payload[field.name] = parsedValue;
      continue;
    }

    payload[field.name] = String(value).trim();
  }

  if (!payload.name) {
    return { error: "Name is required." };
  }

  return { payload };
}

function formatItemSummary(catalogKey, item) {
  if (catalogKey === "dueDates") {
    return `${item.days_to_due_date} days ${item.before_after}`;
  }

  if (catalogKey === "statuses") {
    return item.is_closed ? "Closed" : "Open";
  }

  return item.color;
}

function LookupField({ field, value, onChange }) {
  if (field.type === "checkbox") {
    return (
      <label className="settings-check-field">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{field.label}</span>
      </label>
    );
  }

  return (
    <label className="settings-field">
      <span>{field.label}</span>
      {field.type === "select" ? (
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={field.type}
          value={value}
          min={field.type === "number" ? 0 : undefined}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

function CatalogRow({ catalogKey, item, onEdit, onDelete }) {
  return (
    <div className="settings-row">
      <div className="settings-row__main">
        <span className="settings-dot" style={{ background: item.color || "#647084" }} aria-hidden="true" />
        <div>
          <strong>{item.name}</strong>
          <span>{formatItemSummary(catalogKey, item)}</span>
        </div>
      </div>

      <div className="settings-row__actions">
        <button className="button" type="button" onClick={() => onEdit(item)}>
          <PencilLine size={15} aria-hidden="true" />
          Edit
        </button>
        <button className="button button-danger" type="button" onClick={() => onDelete(item)}>
          <Trash2 size={15} aria-hidden="true" />
          Delete
        </button>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { currentUser } = useCurrentUser();
  const [activeCatalogKey, setActiveCatalogKey] = useState("statuses");
  const [catalogs, setCatalogs] = useState(createEmptyCatalogState);
  const [catalogErrors, setCatalogErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formValues, setFormValues] = useState(() => cloneDefaultValues(CATALOGS.statuses));
  const [editingName, setEditingName] = useState("");
  const [actionError, setActionError] = useState("");

  const activeCatalog = CATALOGS[activeCatalogKey];
  const activeItems = useMemo(
    () => [...(catalogs[activeCatalogKey] ?? [])].sort((left, right) => left.name.localeCompare(right.name)),
    [activeCatalogKey, catalogs]
  );

  useEffect(() => {
    setFormValues(cloneDefaultValues(activeCatalog));
    setEditingName("");
    setActionError("");
  }, [activeCatalog]);

  useEffect(() => {
    let ignore = false;

    async function loadCatalogs() {
      setLoading(true);
      setCatalogErrors({});

      try {
        const results = await Promise.allSettled(
          CATALOG_ORDER.map(async (key) => {
            const catalog = CATALOGS[key];
            const payload = await listLookup(currentUser.apiKey, catalog.resource);
            return [key, getResults(payload)];
          })
        );

        if (ignore) return;

        const nextCatalogs = createEmptyCatalogState();
        const nextErrors = {};

        results.forEach((result, index) => {
          const key = CATALOG_ORDER[index];
          if (result.status === "fulfilled") {
            const [resolvedKey, items] = result.value;
            nextCatalogs[resolvedKey] = items;
            return;
          }

          nextErrors[key] = getErrorMessage(
            result.reason,
            `No s'ha pogut carregar ${CATALOGS[key].label.toLowerCase()}.`
          );
        });

        setCatalogs(nextCatalogs);
        setCatalogErrors(nextErrors);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void loadCatalogs();

    return () => {
      ignore = true;
    };
  }, [currentUser.apiKey]);

  async function refreshCatalog(catalogKey) {
    const catalog = CATALOGS[catalogKey];
    const payload = await listLookup(currentUser.apiKey, catalog.resource);
    setCatalogs((current) => ({
      ...current,
      [catalogKey]: getResults(payload),
    }));
  }

  function startCreate() {
    setFormValues(cloneDefaultValues(activeCatalog));
    setEditingName("");
    setActionError("");
  }

  function startEdit(item) {
    setFormValues(itemToFormValues(activeCatalog, item));
    setEditingName(item.name);
    setActionError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const { payload, error } = serializeFormValues(activeCatalog, formValues);
    if (error) {
      setActionError(error);
      return;
    }

    setSaving(true);
    setActionError("");

    try {
      if (editingName) {
        await updateLookup(currentUser.apiKey, activeCatalog.resource, editingName, payload);
      } else {
        await createLookup(currentUser.apiKey, activeCatalog.resource, payload);
      }

      await refreshCatalog(activeCatalogKey);
      startCreate();
    } catch (lookupError) {
      setActionError(
        getErrorMessage(
          lookupError,
          `No s'ha pogut ${editingName ? "actualitzar" : "crear"} ${activeCatalog.singular}.`
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete ${item.name}?`)) return;

    setSaving(true);
    setActionError("");

    try {
      await deleteLookup(currentUser.apiKey, activeCatalog.resource, item.name);
      await refreshCatalog(activeCatalogKey);

      if (editingName === item.name) {
        startCreate();
      }
    } catch (lookupError) {
      setActionError(getErrorMessage(lookupError, `No s'ha pogut eliminar ${activeCatalog.singular}.`));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-stack settings-page">
      <div className="section-header settings-header">
        <div>
          <span className="eyebrow">Configuration</span>
          <h2>Catalog settings</h2>
          <p>Manage the lookup values used across issue creation and filtering.</p>
        </div>

        <Link className="button" to="/issues">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to issues
        </Link>
      </div>

      {loading ? <LoadingState /> : null}

      <div className="settings-layout">
        <aside className="panel settings-sidebar">
          <div className="settings-sidebar__title">
            <Settings2 size={18} aria-hidden="true" />
            Catalogs
          </div>

          <div className="settings-nav">
            {CATALOG_ORDER.map((key) => {
              const catalog = CATALOGS[key];
              const itemCount = catalogs[key]?.length ?? 0;
              const hasError = Boolean(catalogErrors[key]);

              return (
                <button
                  key={key}
                  className={`settings-nav-item${activeCatalogKey === key ? " is-active" : ""}`}
                  type="button"
                  onClick={() => setActiveCatalogKey(key)}
                >
                  <span>
                    <strong>{catalog.label}</strong>
                    <small>{itemCount} items</small>
                  </span>
                  {hasError ? <span className="settings-nav-item__error">!</span> : null}
                </button>
              );
            })}
          </div>
        </aside>

        <main className="panel settings-panel">
          <div className="settings-panel__header">
            <div>
              <span className="eyebrow">{activeCatalog.label}</span>
              <h3>{editingName ? `Edit ${activeCatalog.singular}` : `Create ${activeCatalog.singular}`}</h3>
              <p>{activeCatalog.description}</p>
            </div>

            <button className="button" type="button" onClick={startCreate} disabled={saving}>
              <RefreshCw size={16} aria-hidden="true" />
              Reset form
            </button>
          </div>

          {catalogErrors[activeCatalogKey] ? (
            <p className="form-error">{catalogErrors[activeCatalogKey]}</p>
          ) : null}

          <form className="settings-form" onSubmit={handleSubmit}>
            <div className="settings-form-grid">
              {activeCatalog.fields.map((field) => (
                <LookupField
                  key={field.name}
                  field={field}
                  value={formValues[field.name]}
                  onChange={(value) =>
                    setFormValues((current) => ({
                      ...current,
                      [field.name]: value,
                    }))
                  }
                />
              ))}
            </div>

            {actionError ? <p className="form-error">{actionError}</p> : null}

            <div className="settings-form-actions">
              <button className="button" type="button" onClick={startCreate} disabled={saving}>
                Cancel
              </button>
              <button className="button button-primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : editingName ? "Save changes" : `Create ${activeCatalog.singular}`}
              </button>
            </div>
          </form>

          <div className="settings-list-header">
            <h3>Current values</h3>
            <span>{activeItems.length} total</span>
          </div>

          {activeItems.length > 0 ? (
            <div className="settings-list">
              {activeItems.map((item) => (
                <CatalogRow
                  key={item.name}
                  catalogKey={activeCatalogKey}
                  item={item}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : loading ? null : (
            <EmptyState
              title={`No ${activeCatalog.label.toLowerCase()} yet`}
              description={`Create the first ${activeCatalog.singular} to start using it in the app.`}
            />
          )}
        </main>
      </div>
    </section>
  );
}
