import { ArrowLeft, PencilLine, Plus, Settings2, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { useCurrentUser } from "../context/currentUser";
import { createLookup, deleteLookup, listLookup, updateLookup } from "../api/lookups";

const CATALOGS = {
  statuses: {
    label: "Statuses",
    singular: "status",
    resource: "statuses",
    description: "Workflow states that define where an issue is in the process.",
    fields: [
      { name: "name", label: "Name", type: "text", placeholder: "Open" },
      { name: "color", label: "Color", type: "color" },
      { name: "is_closed", label: "Closed status", type: "checkbox" },
    ],
    defaultValues: { name: "", color: "#0d8aa8", is_closed: false },
  },
  types: {
    label: "Types",
    singular: "type",
    resource: "types",
    description: "Issue categories used to group similar work.",
    fields: [
      { name: "name", label: "Name", type: "text", placeholder: "Bug" },
      { name: "color", label: "Color", type: "color" },
    ],
    defaultValues: { name: "", color: "#6c5ce7" },
  },
  priorities: {
    label: "Priorities",
    singular: "priority",
    resource: "priorities",
    description: "Urgency levels that help the team decide what to tackle first.",
    fields: [
      { name: "name", label: "Name", type: "text", placeholder: "High" },
      { name: "color", label: "Color", type: "color" },
    ],
    defaultValues: { name: "", color: "#e17055" },
  },
  severities: {
    label: "Severities",
    singular: "severity",
    resource: "severities",
    description: "Impact levels that describe how serious an issue is.",
    fields: [
      { name: "name", label: "Name", type: "text", placeholder: "Critical" },
      { name: "color", label: "Color", type: "color" },
    ],
    defaultValues: { name: "", color: "#f39c12" },
  },
  tags: {
    label: "Tags",
    singular: "tag",
    resource: "tags",
    description: "Free-form labels that can be attached to one or many issues.",
    fields: [
      { name: "name", label: "Name", type: "text", placeholder: "frontend" },
      { name: "color", label: "Color", type: "color" },
    ],
    defaultValues: { name: "", color: "#c084fc" },
  },
  dueDates: {
    label: "Due date statuses",
    singular: "due date status",
    resource: "due-dates",
    description: "Buckets for deadlines, such as items due before or after a target date.",
    fields: [
      { name: "name", label: "Name", type: "text", placeholder: "Due soon" },
      { name: "color", label: "Color", type: "color" },
      { name: "days_to_due_date", label: "Days to due date", type: "number", placeholder: "3" },
      {
        name: "before_after",
        label: "Timing",
        type: "select",
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
      if (value === "" || value === null || value === undefined) {
        return { error: `${field.label} is required.` };
      }

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
      <label className="settings-field settings-field--check">
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
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

function SettingsModal({ catalog, mode, value, saving, onClose, onSubmit, onChange }) {
  if (!catalog) return null;

  return (
    <div className="settings-modal" role="presentation" onClick={onClose}>
      <div
        className="settings-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`${mode === "edit" ? "Edit" : "Create"} ${catalog.singular}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="settings-modal__header">
          <div>
            <span className="eyebrow">{mode === "edit" ? "Edit" : "Create"}</span>
            <h3>{mode === "edit" ? `Edit ${catalog.singular}` : `Create ${catalog.singular}`}</h3>
            <p>{catalog.description}</p>
          </div>

          <button className="button settings-modal__close" type="button" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <form className="settings-modal__form" onSubmit={onSubmit}>
          <div className="settings-form-grid">
            {catalog.fields.map((field) => (
              <LookupField
                key={field.name}
                field={field}
                value={value[field.name]}
                onChange={(nextValue) =>
                  onChange((current) => ({
                    ...current,
                    [field.name]: nextValue,
                  }))
                }
              />
            ))}
          </div>

          <div className="settings-modal__actions">
            <button className="button" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : mode === "edit" ? "Save changes" : `Create ${catalog.singular}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CatalogRow({ catalogKey, item, onEdit, onDelete }) {
  return (
    <div
      className="settings-row"
      role="button"
      tabIndex={0}
      onClick={() => onEdit(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onEdit(item);
        }
      }}
    >
      <div className="settings-row__main">
        <span className="settings-dot" style={{ background: item.color || "#647084" }} aria-hidden="true" />
        <div>
          <strong>{item.name}</strong>
          <span>{formatItemSummary(catalogKey, item)}</span>
        </div>
      </div>

      <button
        className="button button-danger settings-row__delete"
        type="button"
        aria-label={`Delete ${item.name}`}
        onClick={(event) => {
          event.stopPropagation();
          onDelete(item);
        }}
      >
        <Trash2 size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

export function SettingsPage() {
  const { currentUser } = useCurrentUser();
  const [activeCatalogKey, setActiveCatalogKey] = useState("statuses");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingName, setEditingName] = useState("");
  const [formValues, setFormValues] = useState(() => cloneDefaultValues(CATALOGS.statuses));

  const activeCatalog = CATALOGS[activeCatalogKey];
  const activeItems = useMemo(
    () => [...items].sort((left, right) => left.name.localeCompare(right.name)),
    [items]
  );

  useEffect(() => {
    let ignore = false;

    async function loadItems() {
      setLoading(true);
      setErrorMessage("");

      try {
        const payload = await listLookup(currentUser.apiKey, activeCatalog.resource);
        if (ignore) return;

        setItems(getResults(payload));
      } catch (error) {
        if (ignore) return;

        setItems([]);
        setErrorMessage(
          `Unable to load ${activeCatalog.label.toLowerCase()}. ${getErrorMessage(
            error,
            "Check the API connection and try again."
          )}`
        );
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void loadItems();

    return () => {
      ignore = true;
    };
  }, [activeCatalog.resource, activeCatalog.label, currentUser.apiKey]);

  useEffect(() => {
    setModalOpen(false);
    setEditingName("");
    setFormValues(cloneDefaultValues(activeCatalog));
    setErrorMessage("");
  }, [activeCatalog]);

  function openCreateModal() {
    setModalMode("create");
    setEditingName("");
    setFormValues(cloneDefaultValues(activeCatalog));
    setErrorMessage("");
    setModalOpen(true);
  }

  function openEditModal(item) {
    setModalMode("edit");
    setEditingName(item.name);
    setFormValues(itemToFormValues(activeCatalog, item));
    setErrorMessage("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setErrorMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const { payload, error } = serializeFormValues(activeCatalog, formValues);
    if (error) {
      setErrorMessage(error);
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      if (modalMode === "edit") {
        await updateLookup(currentUser.apiKey, activeCatalog.resource, editingName, payload);
      } else {
        await createLookup(currentUser.apiKey, activeCatalog.resource, payload);
      }

      const refreshed = await listLookup(currentUser.apiKey, activeCatalog.resource);
      setItems(getResults(refreshed));
      closeModal();
      setFormValues(cloneDefaultValues(activeCatalog));
      setEditingName("");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, `Unable to save ${activeCatalog.singular}.`));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete ${item.name}?`)) return;

    setSaving(true);
    setErrorMessage("");

    try {
      await deleteLookup(currentUser.apiKey, activeCatalog.resource, item.name);
      const refreshed = await listLookup(currentUser.apiKey, activeCatalog.resource);
      setItems(getResults(refreshed));

      if (modalOpen && editingName === item.name) {
        closeModal();
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, `Unable to delete ${activeCatalog.singular}.`));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-stack settings-page">
      <div className="section-header settings-header">
        <div>
          <h2>Catalog settings</h2>
          <p>Manage the lookup values used across issue creation and filtering.</p>
        </div>

        <Link className="button" to="/issues">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to issues
        </Link>
      </div>

      <div className="settings-shell">
        <aside className="panel settings-sidebar">
          <div className="settings-sidebar__title">
            <Settings2 size={18} aria-hidden="true" />
            Catalogs
          </div>

          <div className="settings-nav">
            {CATALOG_ORDER.map((key) => {
              const catalog = CATALOGS[key];

              return (
                <button
                  key={key}
                  className={`settings-nav-item${activeCatalogKey === key ? " is-active" : ""}`}
                  type="button"
                  onClick={() => setActiveCatalogKey(key)}
                >
                  <span>
                    <strong>{catalog.label}</strong>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="panel settings-panel">
          <div className="settings-panel__header">
            <div>
              <span className="eyebrow">{activeCatalog.label}</span>
              <h3>{activeCatalog.label}</h3>
              <p>{activeCatalog.description}</p>
            </div>

            <button className="button button-primary" type="button" onClick={openCreateModal}>
              <Plus size={16} aria-hidden="true" />
              Create
            </button>
          </div>

          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          {loading ? <LoadingState /> : null}

          {!loading && activeItems.length > 0 ? (
            <div className="settings-list">
              {activeItems.map((item) => (
                <CatalogRow
                  key={item.name}
                  catalogKey={activeCatalogKey}
                  item={item}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : null}

          {!loading && activeItems.length === 0 && !errorMessage ? (
            <EmptyState
              title={`No ${activeCatalog.label.toLowerCase()} yet`}
              description={`Create the first ${activeCatalog.singular} to start using it in the app.`}
            />
          ) : null}
        </main>
      </div>

      {modalOpen ? (
        <SettingsModal
          catalog={activeCatalog}
          mode={modalMode}
          value={formValues}
          saving={saving}
          onClose={closeModal}
          onSubmit={handleSubmit}
          onChange={setFormValues}
        />
      ) : null}
    </section>
  );
}