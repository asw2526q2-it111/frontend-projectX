import { ArrowLeft, Settings2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppBrand } from "../components/AppBrand";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { createLookup, deleteLookup, listLookup, updateLookup } from "../api/lookups";
import { useCurrentUser } from "../context/currentUser";

const CATALOGS = {
  statuses: {
    label: "Statuses",
    singular: "status",
    resource: "statuses",
    description: "Workflow states that define where an issue is in the process.",
    fields: [
      { name: "name", label: "Name", type: "text", placeholder: "Open" },
      { name: "color", label: "Color", type: "color" },
      { name: "is_closed", label: "Closed?", type: "checkbox" },
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
      { name: "days_to_due_date", label: "Days", type: "number", placeholder: "3" },
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
const REASSIGNABLE_CATALOGS = new Set(["statuses", "types", "priorities", "severities"]);

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

function getRowFields(catalog) {
  const colorField = catalog.fields.find((field) => field.name === "color");
  const restFields = catalog.fields.filter((field) => field.name !== "color");
  return colorField ? [colorField, ...restFields] : catalog.fields;
}

function FieldControl({ field, value, onChange, compact = false }) {
  if (field.type === "checkbox") {
    return (
      <label className={`settings-field settings-field--check${compact ? " settings-field--compact" : ""}`}>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{field.label}</span>
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className="settings-field">
        {!compact ? <span>{field.label}</span> : null}
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.name === "color") {
    return (
      <label className="settings-field settings-field--color">
        {!compact ? <span>{field.label}</span> : null}
        <div className="settings-color-field">
          <span className="settings-color-swatch" style={{ background: value || "#94a3b8" }} aria-hidden="true" />
          <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-label={field.label}
          />
        </div>
      </label>
    );
  }

  if (field.type === "number") {
    return (
      <label className="settings-field">
        {!compact ? <span>{field.label}</span> : null}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value.replace(/\D+/g, ""))}
        />
      </label>
    );
  }

  return (
    <label className="settings-field">
      {!compact ? <span>{field.label}</span> : null}
      <input
        type={field.type}
        value={value}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SettingsRow({ catalog, item, draft, saving, onChange, onSave, onDelete }) {
  const rowFields = getRowFields(catalog);
  const isDueDateCatalog = catalog.resource === "due-dates";

  return (
    <tr className={`settings-manage-row${isDueDateCatalog ? " settings-manage-row--due-dates" : ""}`}>
      {rowFields.map((field) => (
        <td
          key={field.name}
          className={`settings-manage-cell settings-manage-cell--${field.name}${
            field.type === "checkbox" ? " settings-manage-cell--center" : ""
          }${field.name === "color" ? " settings-manage-cell--color" : ""}`}
        >
          <FieldControl
            field={field}
            value={draft[field.name]}
            onChange={(nextValue) => onChange(item.name, field.name, nextValue)}
            compact
          />
        </td>
      ))}

      <td className="settings-manage-cell settings-table-actions">
        <div className="settings-table-actions__inner">
          <button className="button button-primary" type="button" onClick={() => onSave(item.name)} disabled={saving}>
            Save
          </button>
          <button className="button button-danger" type="button" onClick={() => onDelete(item)} disabled={saving}>
            <Trash2 size={14} aria-hidden="true" />
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

export function SettingsPage() {
  const { currentUser } = useCurrentUser();
  const [activeCatalogKey, setActiveCatalogKey] = useState("statuses");
  const [items, setItems] = useState([]);
  const [rowDrafts, setRowDrafts] = useState({});
  const [createDraft, setCreateDraft] = useState(() => cloneDefaultValues(CATALOGS.statuses));
  const [loading, setLoading] = useState(true);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingRowName, setSavingRowName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteDialog, setDeleteDialog] = useState(null);

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

        const nextItems = getResults(payload);
        setItems(nextItems);
        setRowDrafts(
          Object.fromEntries(nextItems.map((item) => [item.name, itemToFormValues(activeCatalog, item)]))
        );
      } catch (error) {
        if (ignore) return;

        setItems([]);
        setRowDrafts({});
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
    setCreateDraft(cloneDefaultValues(activeCatalog));
    setErrorMessage("");
  }, [activeCatalog]);

  function handleCreateFieldChange(fieldName, value) {
    setCreateDraft((current) => ({
      ...current,
      [fieldName]: value,
    }));
  }

  function handleRowFieldChange(originalName, fieldName, value) {
    setRowDrafts((current) => ({
      ...current,
      [originalName]: {
        ...(current[originalName] ?? {}),
        [fieldName]: value,
      },
    }));
  }

  async function refreshCatalog() {
    const payload = await listLookup(currentUser.apiKey, activeCatalog.resource);
    const nextItems = getResults(payload);
    setItems(nextItems);
    setRowDrafts(Object.fromEntries(nextItems.map((item) => [item.name, itemToFormValues(activeCatalog, item)])));
  }

  function closeDeleteDialog() {
    setDeleteDialog(null);
  }

  async function buildReplacementDialog(item, message) {
    setDeleteDialog({
      item,
      loading: true,
      replacementOptions: [],
      replacement: "",
      message,
    });

    try {
      const lookupPayload = await listLookup(currentUser.apiKey, activeCatalog.resource);
      const replacementOptions = getResults(lookupPayload).filter((option) => option.name !== item.name);

      setDeleteDialog((current) =>
        current
          ? {
              ...current,
              loading: false,
              replacementOptions,
              replacement: replacementOptions[0]?.name ?? "",
            }
          : current
      );
    } catch (inspectError) {
      setDeleteDialog((current) =>
        current
          ? {
              ...current,
              loading: false,
              message: getErrorMessage(
                inspectError,
                `Unable to load replacement ${activeCatalog.label.toLowerCase()} for ${item.name}.`
              ),
            }
          : current
      );
    }
  }

  async function handleDelete(item) {
    setSavingRowName(item.name);
    setErrorMessage("");

    try {
      await deleteLookup(currentUser.apiKey, activeCatalog.resource, item.name);
      await refreshCatalog();
      closeDeleteDialog();
    } catch (error) {
      if (error?.status === 409) {
        if (REASSIGNABLE_CATALOGS.has(activeCatalogKey) && activeItems.length > 1) {
          await buildReplacementDialog(
            item,
            `${item.name} is still being used by one or more issues. Choose a replacement ${activeCatalog.singular} before deleting it.`
          );
          return;
        }

        setErrorMessage(
          `Unable to delete ${item.name}. It is the last ${activeCatalog.singular}, so it must remain available.`
        );
        return;
      }

      if (!REASSIGNABLE_CATALOGS.has(activeCatalogKey)) {
        setErrorMessage(getErrorMessage(error, `Unable to delete ${activeCatalog.singular}.`));
        return;
      }

      await buildReplacementDialog(
        item,
        getErrorMessage(
          error,
          `Choose a replacement ${activeCatalog.singular} before deleting ${item.name}.`
        )
      );
    } finally {
      setSavingRowName("");
    }
  }

  async function confirmDelete() {
    if (!deleteDialog) return;

    const { item, replacement } = deleteDialog;
    if (!replacement) {
      setErrorMessage("Please choose a replacement.");
      return;
    }

    setSavingRowName(item.name);
    setErrorMessage("");

    try {
      await deleteLookup(currentUser.apiKey, activeCatalog.resource, item.name, replacement);
      await refreshCatalog();
      closeDeleteDialog();
    } catch (error) {
      if (error?.status === 409) {
        if (activeItems.length > 1) {
          setErrorMessage(
            `${item.name} is still being used by one or more issues. Please choose a replacement and try again.`
          );
        } else {
          closeDeleteDialog();
          setErrorMessage(
            `Unable to delete ${item.name}. It is the last ${activeCatalog.singular}, so it must remain available.`
          );
        }
        return;
      }

      setErrorMessage(getErrorMessage(error, `Unable to delete ${activeCatalog.singular}.`));
    } finally {
      setSavingRowName("");
    }
  }

  async function handleCreate(event) {
    event.preventDefault();

    const { payload, error } = serializeFormValues(activeCatalog, createDraft);
    if (error) {
      setErrorMessage(error);
      return;
    }

    setSavingCreate(true);
    setErrorMessage("");

    try {
      await createLookup(currentUser.apiKey, activeCatalog.resource, payload);
      await refreshCatalog();
      setCreateDraft(cloneDefaultValues(activeCatalog));
    } catch (error) {
      setErrorMessage(getErrorMessage(error, `Unable to create ${activeCatalog.singular}.`));
    } finally {
      setSavingCreate(false);
    }
  }

  async function handleSave(originalName) {
    const draft = rowDrafts[originalName] ?? {};
    const { payload, error } = serializeFormValues(activeCatalog, draft);
    if (error) {
      setErrorMessage(error);
      return;
    }

    setSavingRowName(originalName);
    setErrorMessage("");

    try {
      await updateLookup(currentUser.apiKey, activeCatalog.resource, originalName, payload);
      await refreshCatalog();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, `Unable to save ${activeCatalog.singular}.`));
    } finally {
      setSavingRowName("");
    }
  }

  return (
    <section className="page-stack settings-page settings-workspace issue-workspace lookup-manage-page">
      <div className="app-bg-shape app-bg-shape-left" aria-hidden="true" />
      <div className="app-bg-shape app-bg-shape-right" aria-hidden="true" />

      <header className="topbar custom-topbar issue-topbar settings-topbar">
        <AppBrand className="issue-workspace-brand" subtitle="Configuration Hub" />

        <div className="topbar-search settings-topbar-spacer" aria-hidden="true" />

        <div className="topbar-profile settings-topbar-profile">
          <Link className="button settings-back-button" to="/issues">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to issues
          </Link>
        </div>
      </header>

      <main className="settings-layout">
        <aside className="panel settings-sidebar settings-sidebar-panel">
          <div className="settings-sidebar__title settings-menu-title">
            <Settings2 size={17} aria-hidden="true" />
            Settings Menu
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
                  <span>{catalog.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="settings-content">
          <section className="panel settings-create-card">
            <h2>Add new {activeCatalog.singular}</h2>

            <form className="settings-create-form" onSubmit={handleCreate}>
              <div className="settings-create-grid">
                {activeCatalog.fields.map((field) => (
                  <div key={field.name} className={`settings-create-cell settings-create-cell--${field.name}`}>
                    <FieldControl
                      field={field}
                      value={createDraft[field.name]}
                      onChange={(nextValue) => handleCreateFieldChange(field.name, nextValue)}
                      compact
                    />
                  </div>
                ))}

                <button className="button button-primary settings-create-button" type="submit" disabled={savingCreate}>
                  Add
                </button>
              </div>
            </form>

            {errorMessage ? <p className="form-error settings-error">{errorMessage}</p> : null}
          </section>

          <section className="panel settings-table-card">
            <h2>Existing {activeCatalog.label.toLowerCase()}</h2>

            {loading ? <LoadingState /> : null}

            {!loading && activeItems.length > 0 ? (
              <div className="settings-table-wrap">
                <table className="settings-manage-table">
                  <thead>
                    <tr>
                      {getRowFields(activeCatalog).map((field) => (
                        <th key={field.name} className={field.name === "color" ? "settings-manage-head settings-manage-head--color" : "settings-manage-head"}>
                          {field.label}
                        </th>
                      ))}
                      <th className="settings-manage-head settings-manage-head--actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeItems.map((item) => (
                      <SettingsRow
                        key={item.name}
                        catalog={activeCatalog}
                        item={item}
                        draft={rowDrafts[item.name] ?? itemToFormValues(activeCatalog, item)}
                        saving={savingRowName === item.name}
                        onChange={handleRowFieldChange}
                        onSave={handleSave}
                        onDelete={handleDelete}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {!loading && activeItems.length === 0 && !errorMessage ? (
              <EmptyState
                title={`No ${activeCatalog.label.toLowerCase()} yet`}
                description={`Create the first ${activeCatalog.singular} to start using it in the app.`}
              />
            ) : null}
          </section>
        </div>
      </main>

      {deleteDialog ? (
        <div className="settings-delete-modal" role="presentation" onClick={closeDeleteDialog}>
          <div className="settings-delete-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="settings-delete-header">
              <div>
                <span className="eyebrow">Delete {activeCatalog.singular}</span>
                <h3>Delete {deleteDialog.item.name}</h3>
                <p>
                  {deleteDialog.loading ? "Loading replacement options..." : deleteDialog.message}
                </p>
              </div>
            </div>

            {deleteDialog.loading ? <LoadingState /> : null}

            {!deleteDialog.loading && deleteDialog.replacementOptions.length > 0 ? (
              <label className="settings-delete-field">
                <span>Replacement</span>
                <select
                  value={deleteDialog.replacement}
                  onChange={(event) =>
                    setDeleteDialog((current) => (current ? { ...current, replacement: event.target.value } : current))
                  }
                >
                  {deleteDialog.replacementOptions.map((option) => (
                    <option key={option.name} value={option.name}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {!deleteDialog.loading && deleteDialog.replacementOptions.length === 0 ? (
              <p className="settings-delete-note">No replacement values are available for this catalog.</p>
            ) : null}

            <div className="settings-delete-actions">
              <button className="button" type="button" onClick={closeDeleteDialog} disabled={savingRowName === deleteDialog.item.name}>
                Cancel
              </button>
              <button
                className="button button-danger"
                type="button"
                onClick={confirmDelete}
                disabled={
                  deleteDialog.loading ||
                  savingRowName === deleteDialog.item.name ||
                  !deleteDialog.replacementOptions.length ||
                  !deleteDialog.replacement
                }
              >
                {savingRowName === deleteDialog.item.name ? "Deleting..." : "Delete with replacement"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
