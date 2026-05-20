import { ArrowLeft, Settings2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppBrand } from "../components/AppBrand";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { createLookup, deleteLookup, listLookup, updateLookup } from "../api/lookups";
import { listIssues, updateIssue } from "../api/issues";
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
const REASSIGNABLE_CATALOGS = new Set(["statuses", "types", "priorities", "severities", "tags"]);
const ISSUE_LOOKUP_FIELDS = {
  statuses: "status",
  types: "type",
  priorities: "priority",
  severities: "severity",
};

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

function getLookupName(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value.name) return String(value.name);
  return "";
}

function getTagNames(tags) {
  if (!Array.isArray(tags)) return [];

  return tags
    .map((tag) => {
      if (!tag) return "";
      if (typeof tag === "string") return tag;
      if (typeof tag === "object" && tag.name) return String(tag.name);
      return "";
    })
    .filter(Boolean);
}

function isIssueAffected(issue, catalogKey, lookupName) {
  if (catalogKey === "tags") {
    return getTagNames(issue.tags).includes(lookupName);
  }

  const issueLookupValue = getLookupName(issue?.[ISSUE_LOOKUP_FIELDS[catalogKey] ?? ""]);
  return issueLookupValue === lookupName;
}

function buildIssueReplacementPayload(issue, catalogKey, originalName, replacementName) {
  if (catalogKey === "tags") {
    const nextTags = getTagNames(issue.tags).map((tagName) => (tagName === originalName ? replacementName : tagName));
    return { tags: Array.from(new Set(nextTags)) };
  }

  const fieldNameMap = {
    statuses: "status",
    types: "type",
    priorities: "priority",
    severities: "severity",
  };

  return { [fieldNameMap[catalogKey] ?? catalogKey]: replacementName };
}

function getGridTemplate(catalog) {
  return getRowFields(catalog)
    .map((field) => {
      if (field.name === "color") return "72px";
      if (field.name === "name") return "minmax(150px, 180px)";
      if (field.type === "number") return "88px";
      if (field.type === "checkbox") return "112px";
      if (field.type === "select") return "minmax(110px, 120px)";
      return "minmax(120px, 1fr)";
    })
    .concat("120px")
    .join(" ");
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

function SettingsRow({ catalog, item, draft, saving, onChange, onSave, onDelete, gridTemplateColumns }) {
  const rowFields = getRowFields(catalog);

  return (
    <div className="settings-table-row" style={{ gridTemplateColumns }}>
      {rowFields.map((field, index) => (
        <div
          key={field.name}
          className={`settings-table-cell${field.type === "checkbox" ? " settings-table-cell--center" : ""}${
            field.name === "color" ? " settings-table-cell--color" : ""
          }`}
        >
          <FieldControl
            field={field}
            value={draft[field.name]}
            onChange={(nextValue) => onChange(item.name, field.name, nextValue)}
            compact={index > 0}
          />
        </div>
      ))}

      <div className="settings-table-cell settings-table-actions">
        <button className="button button-primary" type="button" onClick={() => onSave(item.name)} disabled={saving}>
          Save
        </button>
        <button className="button button-danger" type="button" onClick={() => onDelete(item.name)} disabled={saving}>
          <Trash2 size={14} aria-hidden="true" />
          Delete
        </button>
      </div>
    </div>
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
  const rowGridTemplate = useMemo(() => getGridTemplate(activeCatalog), [activeCatalog]);

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

  async function openDeleteDialog(item) {
    const supportsReplacement = REASSIGNABLE_CATALOGS.has(activeCatalogKey);
    const replacementOptions = activeItems.filter((option) => option.name !== item.name);

    setDeleteDialog({
      item,
      loading: supportsReplacement,
      supportsReplacement,
      replacementOptions,
      replacement: replacementOptions[0]?.name ?? "",
      affectedCount: 0,
      affectedIssues: [],
    });

    if (!supportsReplacement) return;

    try {
      let payload;
      // Try to ask the backend for only the issues that match this lookup to save bandwidth.
      if (activeCatalogKey === "tags") {
        payload = await listIssues(currentUser.apiKey, { tags: item.name });
      } else if (ISSUE_LOOKUP_FIELDS[activeCatalogKey]) {
        payload = await listIssues(currentUser.apiKey, { [ISSUE_LOOKUP_FIELDS[activeCatalogKey]]: item.name });
      } else {
        payload = await listIssues(currentUser.apiKey);
      }

      const allIssues = getResults(payload);
      // In case the backend doesn't support filtering, fall back to client-side check.
      const affectedIssues = allIssues.filter((issue) => isIssueAffected(issue, activeCatalogKey, item.name));

      setDeleteDialog((current) =>
        current
          ? {
              ...current,
              loading: false,
              affectedCount: affectedIssues.length,
              affectedIssues,
            }
          : current
      );
    } catch (error) {
      setDeleteDialog(null);
      setErrorMessage(getErrorMessage(error, `Unable to inspect issues that use ${item.name}.`));
    }
  }

  function closeDeleteDialog() {
    setDeleteDialog(null);
  }

  async function confirmDelete() {
    if (!deleteDialog) return;

    const { item, supportsReplacement, affectedIssues, replacement } = deleteDialog;
    if (supportsReplacement && affectedIssues.length > 0 && !replacement) {
      setErrorMessage("Please choose a replacement.");
      return;
    }

    setSavingRowName(item.name);
    setErrorMessage("");

    try {
      if (supportsReplacement && affectedIssues.length > 0) {
        const replacementPayloads = affectedIssues.map((issue) =>
          updateIssue(currentUser.apiKey, issue.id, buildIssueReplacementPayload(issue, activeCatalogKey, item.name, replacement))
        );
        await Promise.all(replacementPayloads);
      }

      await deleteLookup(currentUser.apiKey, activeCatalog.resource, item.name);
      await refreshCatalog();
      closeDeleteDialog();
    } catch (error) {
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
    <section className="page-stack settings-page settings-workspace issue-workspace">
      <header className="topbar custom-topbar issue-topbar">
        <AppBrand className="issue-workspace-brand" subtitle="Focus mode for bug tracking and triage" />

        <div className="topbar-search" aria-hidden="true" />

        <Link className="button settings-back-button" to="/issues">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to issues
        </Link>
      </header>

      <main className="settings-shell">
        <aside className="panel settings-sidebar">
          <div className="settings-sidebar__title">
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

        <section className="settings-main">
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
            <h2>Existing edit {activeCatalog.label.toLowerCase()}</h2>

            {loading ? <LoadingState /> : null}

            {!loading && activeItems.length > 0 ? (
              <div className="settings-table">
                <div
                  className="settings-table-row settings-table-row--header"
                  style={{ gridTemplateColumns: rowGridTemplate }}
                >
                  {getRowFields(activeCatalog).map((field) => (
                    <div key={field.name} className="settings-table-head">
                      {field.label}
                    </div>
                  ))}
                  <div className="settings-table-head">Actions</div>
                </div>

                {activeItems.map((item) => (
                  <SettingsRow
                    key={item.name}
                    catalog={activeCatalog}
                    item={item}
                    draft={rowDrafts[item.name] ?? itemToFormValues(activeCatalog, item)}
                    saving={savingRowName === item.name}
                    onChange={handleRowFieldChange}
                    onSave={handleSave}
                    onDelete={openDeleteDialog}
                    gridTemplateColumns={rowGridTemplate}
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
          </section>
        </section>
      </main>

      {deleteDialog ? (
        <div className="settings-delete-modal" role="presentation" onClick={closeDeleteDialog}>
          <div className="settings-delete-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="settings-delete-header">
              <div>
                <span className="eyebrow">Delete {activeCatalog.singular}</span>
                <h3>Delete {deleteDialog.item.name}</h3>
                <p>
                  {deleteDialog.loading
                    ? "Checking issues that use this value..."
                    : deleteDialog.affectedCount > 0
                      ? `${deleteDialog.affectedCount} issue${deleteDialog.affectedCount === 1 ? "" : "s"} will be reassigned first.`
                      : "No issues currently use this value."}
                </p>
              </div>
            </div>

            {deleteDialog.supportsReplacement ? (
              deleteDialog.loading ? (
                <LoadingState />
              ) : deleteDialog.affectedCount > 0 ? (
                deleteDialog.replacementOptions.length > 0 ? (
                  <label className="settings-delete-field">
                    <span>Replacement</span>
                    <select
                      value={deleteDialog.replacement}
                      onChange={(event) =>
                        setDeleteDialog((current) => (current ? { ...current, replacement: event.target.value } : current))
                      }
                    >
                      <option value="">Select replacement</option>
                      {deleteDialog.replacementOptions.map((option) => (
                        <option key={option.name} value={option.name}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <p className="settings-delete-note">No replacement values are available, so this value cannot be deleted while issues still use it.</p>
                )
              ) : (
                <p className="settings-delete-note">You can delete this value directly because no issues use it.</p>
              )
            ) : (
              <p className="settings-delete-note">This catalog can be deleted directly.</p>
            )}

            <div className="settings-delete-actions">
              <button className="button" type="button" onClick={closeDeleteDialog} disabled={savingRowName === deleteDialog.item.name}>
                Cancel
              </button>
              <button
                className="button button-danger"
                type="button"
                onClick={confirmDelete}
                disabled={savingRowName === deleteDialog.item.name || (deleteDialog.supportsReplacement && deleteDialog.affectedCount > 0 && !deleteDialog.replacement)}
              >
                {savingRowName === deleteDialog.item.name ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
