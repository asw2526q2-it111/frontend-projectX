import { Check, ChevronDown, Plus, UserCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createIssue } from "../api/issues";
import { createLookup, listLookup } from "../api/lookups";
import { listUsers } from "../api/users";
import { useCurrentUser } from "../context/currentUser";
import { initials } from "../utils/format";

const LOOKUP_GROUPS = [
  { key: "status", resource: "statuses", label: "Status", color: "#0d8aa8" },
  { key: "type", resource: "types", label: "Type", color: "#6c5ce7" },
  { key: "priority", resource: "priorities", label: "Priority", color: "#e17055" },
  { key: "severity", resource: "severities", label: "Severity", color: "#f39c12" },
];

const TAG_GROUP = { key: "tag", resource: "tags", label: "Tag", color: "#e17055" };

const EMPTY_LOOKUPS = {
  statuses: [],
  types: [],
  priorities: [],
  severities: [],
  tags: [],
};

const EMPTY_METADATA = {
  status: "",
  type: "",
  priority: "",
  severity: "",
};

function getResults(payload) {
  return Array.isArray(payload?.results) ? payload.results : [];
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

function getDisplayName(user) {
  return user?.full_name || user?.fullName || user?.username || "User";
}

function getUserInitials(user) {
  return user?.initials || initials(getDisplayName(user));
}

function UserAvatar({ user, size = "md" }) {
  const className = `create-user-avatar create-user-avatar--${size}`;

  if (user?.avatar_url) {
    return <img className={className} src={user.avatar_url} alt={`Avatar de ${user.username}`} />;
  }

  return (
    <span className={`${className} create-user-avatar--initials`} aria-hidden="true">
      {getUserInitials(user)}
    </span>
  );
}

function ColorDot({ color }) {
  return <span className="create-color-dot" style={{ background: color || "#94a3b8" }} />;
}

function LookupDropdown({ label, value, options, onChange, onCreate }) {
  const selected = options.find((option) => option.name === value);

  return (
    <div className="create-field">
      <span className="create-label">{label}</span>
      <details className="create-picker">
        <summary className="create-picker-summary">
          <span className="create-picker-value">
            <ColorDot color={selected?.color} />
            <span>{selected?.name || `Select ${label.toLowerCase()}`}</span>
          </span>
          <ChevronDown size={16} aria-hidden="true" />
        </summary>
        <div className="create-picker-menu">
          {options.map((option) => (
            <button
              className={`create-picker-option${option.name === value ? " is-selected" : ""}`}
              key={option.name}
              type="button"
              onClick={() => onChange(option.name)}
            >
              <ColorDot color={option.color} />
              <span>{option.name}</span>
              {option.name === value ? <Check size={15} aria-hidden="true" /> : null}
            </button>
          ))}
          <button className="create-picker-create" type="button" onClick={onCreate}>
            <Plus size={15} aria-hidden="true" />
            New {label.toLowerCase()}
          </button>
        </div>
      </details>
    </div>
  );
}

function TagPicker({ options, selectedTags, onAdd, onRemove, onCreate }) {
  const selectedSet = new Set(selectedTags);
  const selectedOptions = selectedTags.map(
    (tagName) => options.find((tag) => tag.name === tagName) ?? { name: tagName, color: "#647084" }
  );
  const availableOptions = options.filter((tag) => !selectedSet.has(tag.name));

  return (
    <div className="create-field">
      <span className="create-label">Tags</span>
      <div className="create-tag-box">
        <div className="create-tag-list">
          {selectedOptions.length > 0 ? (
            selectedOptions.map((tag) => (
              <span className="create-tag-pill" key={tag.name} style={{ "--tag-color": tag.color }}>
                {tag.name}
                <button type="button" onClick={() => onRemove(tag.name)} aria-label={`Remove ${tag.name}`}>
                  <X size={13} aria-hidden="true" />
                </button>
              </span>
            ))
          ) : (
            <span className="create-empty-text">No tags selected.</span>
          )}
        </div>

        <details className="create-picker create-picker--tags">
          <summary className="create-picker-summary">
            <span>Add tag</span>
            <ChevronDown size={16} aria-hidden="true" />
          </summary>
          <div className="create-picker-menu">
            {availableOptions.length > 0 ? (
              availableOptions.map((tag) => (
                <button
                  className="create-picker-option"
                  key={tag.name}
                  type="button"
                  onClick={() => onAdd(tag.name)}
                >
                  <ColorDot color={tag.color} />
                  <span>{tag.name}</span>
                </button>
              ))
            ) : (
              <span className="create-picker-empty">All tags are selected.</span>
            )}
            <button className="create-picker-create" type="button" onClick={onCreate}>
              <Plus size={15} aria-hidden="true" />
              New tag
            </button>
          </div>
        </details>
      </div>
    </div>
  );
}

function AssigneePicker({ users, selectedUserId, currentUser, onChange }) {
  const selectedUser = users.find((user) => String(user.id) === String(selectedUserId));
  const currentApiUser = users.find((user) => user.username === currentUser.username);
  const isAssignedToCurrentUser =
    currentApiUser && String(currentApiUser.id) === String(selectedUserId);

  return (
    <section className="issue-sidebar-section">
      <div className="issue-people-header">
        <h3 className="issue-sidebar-title">Assigned</h3>
        <button
          className="button create-section-action"
          type="button"
          disabled={!currentApiUser}
          onClick={() => onChange(isAssignedToCurrentUser ? "" : String(currentApiUser.id))}
        >
          <UserCheck size={15} aria-hidden="true" />
          {isAssignedToCurrentUser ? "Unassign" : "Assign me"}
        </button>
      </div>

      {selectedUser ? (
        <div className="create-person-card">
          <UserAvatar user={selectedUser} size="sm" />
          <div>
            <strong>{getDisplayName(selectedUser)}</strong>
            <span>@{selectedUser.username}</span>
          </div>
        </div>
      ) : (
        <p className="create-empty-text">No one is assigned yet.</p>
      )}

      <details className="create-picker create-picker--people">
        <summary className="create-picker-summary">
          <span>{selectedUser ? "Change assignee" : "Select assignee"}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </summary>
        <div className="create-picker-menu">
          <button
            className={`create-user-option${!selectedUserId ? " is-selected" : ""}`}
            type="button"
            onClick={() => onChange("")}
          >
            <span className="create-user-avatar create-user-avatar--sm create-user-avatar--empty">-</span>
            <span>Unassigned</span>
            {!selectedUserId ? <Check size={15} aria-hidden="true" /> : null}
          </button>
          {users.map((user) => (
            <button
              className={`create-user-option${
                String(user.id) === String(selectedUserId) ? " is-selected" : ""
              }`}
              key={user.id}
              type="button"
              onClick={() => onChange(String(user.id))}
            >
              <UserAvatar user={user} size="sm" />
              <span>
                <strong>{getDisplayName(user)}</strong>
                <small>@{user.username}</small>
              </span>
              {String(user.id) === String(selectedUserId) ? <Check size={15} aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      </details>
    </section>
  );
}

function WatchersPicker({ users, selectedUserIds, currentUser, onChange }) {
  const currentApiUser = users.find((user) => user.username === currentUser.username);
  const selectedSet = new Set(selectedUserIds.map(String));
  const selectedUsers = users.filter((user) => selectedSet.has(String(user.id)));
  const currentUserIsWatching = currentApiUser && selectedSet.has(String(currentApiUser.id));

  function toggleUser(userId) {
    const id = String(userId);
    if (selectedSet.has(id)) {
      onChange(selectedUserIds.filter((selectedId) => String(selectedId) !== id));
      return;
    }
    onChange([...selectedUserIds, id]);
  }

  return (
    <section className="issue-sidebar-section">
      <div className="issue-people-header">
        <h3 className="issue-sidebar-title">Watchers</h3>
        <button
          className="button create-section-action"
          type="button"
          disabled={!currentApiUser}
          onClick={() => toggleUser(currentApiUser.id)}
        >
          {currentUserIsWatching ? "Unwatch" : "Watch me"}
        </button>
      </div>

      {selectedUsers.length > 0 ? (
        <div className="create-person-list">
          {selectedUsers.map((user) => (
            <div className="create-person-card" key={user.id}>
              <UserAvatar user={user} size="sm" />
              <div>
                <strong>{getDisplayName(user)}</strong>
                <span>@{user.username}</span>
              </div>
              <button type="button" onClick={() => toggleUser(user.id)} aria-label={`Remove ${user.username}`}>
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="create-empty-text">No watchers yet.</p>
      )}

      <details className="create-picker create-picker--people">
        <summary className="create-picker-summary">
          <span>Select watchers{selectedUsers.length ? ` (${selectedUsers.length})` : ""}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </summary>
        <div className="create-picker-menu">
          {users.length > 0 ? (
            users.map((user) => (
              <label className="create-user-option" key={user.id}>
                <input
                  type="checkbox"
                  checked={selectedSet.has(String(user.id))}
                  onChange={() => toggleUser(user.id)}
                />
                <UserAvatar user={user} size="sm" />
                <span>
                  <strong>{getDisplayName(user)}</strong>
                  <small>@{user.username}</small>
                </span>
              </label>
            ))
          ) : (
            <span className="create-picker-empty">No users available.</span>
          )}
        </div>
      </details>
    </section>
  );
}

function LookupCreatePanel({ target, values, saving, error, onChange, onCancel, onSubmit }) {
  if (!target) return null;

  function handleKeyDown(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    onSubmit();
  }

  return (
    <section className="lookup-inline-panel" aria-label={`Create ${target.label.toLowerCase()}`}>
      <div>
        <span className="eyebrow">New {target.label}</span>
        <h3>Create {target.label.toLowerCase()}</h3>
      </div>

      <div className="lookup-inline-grid">
        <label className="create-field">
          <span className="create-label">Name</span>
          <input
            type="text"
            value={values.name}
            onChange={(event) => onChange({ ...values, name: event.target.value })}
            onKeyDown={handleKeyDown}
            placeholder={`${target.label} name`}
          />
        </label>

        <label className="create-field">
          <span className="create-label">Color</span>
          <input
            type="color"
            value={values.color}
            onChange={(event) => onChange({ ...values, color: event.target.value })}
          />
        </label>

        {target.key === "status" ? (
          <label className="create-check-field">
            <input
              type="checkbox"
              checked={values.is_closed}
              onChange={(event) => onChange({ ...values, is_closed: event.target.checked })}
            />
            Closed status
          </label>
        ) : null}
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="lookup-inline-actions">
        <button className="button" type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button className="button button-primary" type="button" onClick={onSubmit} disabled={saving}>
          {saving ? "Creating..." : "Create"}
        </button>
      </div>
    </section>
  );
}

export function IssueCreatePage() {
  const { currentUser } = useCurrentUser();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [metadata, setMetadata] = useState(EMPTY_METADATA);
  const [selectedTags, setSelectedTags] = useState([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [watcherIds, setWatcherIds] = useState([]);
  const [lookups, setLookups] = useState(EMPTY_LOOKUPS);
  const [users, setUsers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createTarget, setCreateTarget] = useState(null);
  const [createValues, setCreateValues] = useState({ name: "", color: "#0d8aa8", is_closed: false });
  const [creatingLookup, setCreatingLookup] = useState(false);
  const [createLookupError, setCreateLookupError] = useState("");

  const lookupByKey = useMemo(
    () => ({
      status: lookups.statuses,
      type: lookups.types,
      priority: lookups.priorities,
      severity: lookups.severities,
      tag: lookups.tags,
    }),
    [lookups]
  );

  useEffect(() => {
    let ignore = false;

    async function loadCreateData() {
      setLoadingData(true);
      setLoadError("");

      try {
        const [statuses, types, priorities, severities, tags, userList] = await Promise.all([
          listLookup(currentUser.apiKey, "statuses"),
          listLookup(currentUser.apiKey, "types"),
          listLookup(currentUser.apiKey, "priorities"),
          listLookup(currentUser.apiKey, "severities"),
          listLookup(currentUser.apiKey, "tags"),
          listUsers(currentUser.apiKey),
        ]);

        if (ignore) return;

        const nextLookups = {
          statuses: getResults(statuses),
          types: getResults(types),
          priorities: getResults(priorities),
          severities: getResults(severities),
          tags: getResults(tags),
        };

        setLookups(nextLookups);
        setUsers(getResults(userList));
        setMetadata((current) => ({
          status: current.status || nextLookups.statuses[0]?.name || "",
          type: current.type || nextLookups.types[0]?.name || "",
          priority: current.priority || nextLookups.priorities[0]?.name || "",
          severity: current.severity || nextLookups.severities[0]?.name || "",
        }));
      } catch (loadDataError) {
        if (!ignore) {
          setLoadError(getErrorMessage(loadDataError, "No s'han pogut carregar les dades del formulari."));
        }
      } finally {
        if (!ignore) setLoadingData(false);
      }
    }

    void loadCreateData();

    return () => {
      ignore = true;
    };
  }, [currentUser.apiKey]);

  function updateMetadata(key, value) {
    setMetadata((current) => ({ ...current, [key]: value }));
  }

  function openLookupCreate(target) {
    setCreateTarget(target);
    setCreateValues({ name: "", color: target.color, is_closed: false });
    setCreateLookupError("");
  }

  async function refreshLookup(resource) {
    const payload = await listLookup(currentUser.apiKey, resource);
    const items = getResults(payload);
    setLookups((current) => ({ ...current, [resource]: items }));
    return items;
  }

  async function handleCreateLookup() {
    if (!createTarget) return;

    const name = createValues.name.trim();
    if (!name) {
      setCreateLookupError("Name is required.");
      return;
    }

    setCreatingLookup(true);
    setCreateLookupError("");

    try {
      const payload = {
        name,
        color: createValues.color,
        ...(createTarget.key === "status" ? { is_closed: createValues.is_closed } : {}),
      };
      const created = await createLookup(currentUser.apiKey, createTarget.resource, payload);
      await refreshLookup(createTarget.resource);

      if (createTarget.key === "tag") {
        setSelectedTags((current) =>
          current.includes(created.name) ? current : [...current, created.name]
        );
      } else {
        updateMetadata(createTarget.key, created.name);
      }

      setCreateTarget(null);
    } catch (lookupError) {
      setCreateLookupError(getErrorMessage(lookupError, "No s'ha pogut crear."));
    } finally {
      setCreatingLookup(false);
    }
  }

  function addTag(tagName) {
    setSelectedTags((current) => (current.includes(tagName) ? current : [...current, tagName]));
  }

  function removeTag(tagName) {
    setSelectedTags((current) => current.filter((selectedTag) => selectedTag !== tagName));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const issue = await createIssue(currentUser.apiKey, {
        title,
        description,
        deadline: deadline || null,
        status: metadata.status || null,
        type: metadata.type || null,
        priority: metadata.priority || null,
        severity: metadata.severity || null,
        tags: selectedTags,
        assignee_user_id: assigneeId ? Number(assigneeId) : null,
        watcher_user_ids: watcherIds.map((id) => Number(id)),
      });
      navigate(`/issues/${issue.id}`);
    } catch (submitError) {
      setError(getErrorMessage(submitError, "No s'ha pogut crear la issue."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="issue-create-page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">IX</span>
          <div>
            <h1>Issue Hub</h1>
            <p>Create issue</p>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/issues")}>
            Back to issues
          </button>
        </div>
      </header>

      <main className="create-layout issue-shell">
        <div>
          <span className="issue-page-eyebrow">Create</span>
          <h2 className="issue-title-text issue-title-text--form">New issue</h2>
        </div>

        {loadError ? <p className="form-error create-load-error">{loadError}</p> : null}

        <form onSubmit={handleSubmit}>
          <div className="issue-view-grid">
            <div className="issue-content-stack">
              <section className="panel issue-form-panel">
                <div className="issue-form-block">
              <label className="create-field">
                <span className="create-label">Title <strong>*</strong></span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Short, descriptive title"
                  maxLength={255}
                  required
                  autoFocus
                />
              </label>
                </div>

                <div className="issue-form-block">
              <TagPicker
                options={lookupByKey.tag}
                selectedTags={selectedTags}
                onAdd={addTag}
                onRemove={removeTag}
                onCreate={() => openLookupCreate(TAG_GROUP)}
              />
                </div>

                <div className="issue-form-block">
              <label className="create-field">
                <span className="create-label">Description</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe the issue, steps to reproduce, expected behaviour..."
                  rows={10}
                />
              </label>
                </div>

            <LookupCreatePanel
              target={createTarget}
              values={createValues}
              saving={creatingLookup}
              error={createLookupError}
              onChange={setCreateValues}
              onCancel={() => setCreateTarget(null)}
              onSubmit={handleCreateLookup}
            />
              </section>
            </div>

            <aside className="panel issue-sidebar-panel">
              <section className="issue-sidebar-section">
                <h3 className="issue-sidebar-title">Metadata</h3>
              {LOOKUP_GROUPS.map((group) => (
                <LookupDropdown
                  key={group.key}
                  label={group.label}
                  value={metadata[group.key]}
                  options={lookupByKey[group.key]}
                  onChange={(value) => updateMetadata(group.key, value)}
                  onCreate={() => openLookupCreate(group)}
                />
              ))}
            </section>

              <section className="issue-sidebar-section">
                <h3 className="issue-sidebar-title">Planning</h3>
              <label className="create-field">
                <span className="create-label">Deadline</span>
                <div className="create-date-row">
                  <input
                    type="date"
                    value={deadline}
                    onChange={(event) => setDeadline(event.target.value)}
                  />
                  <button className="button" type="button" onClick={() => setDeadline("")}>
                    Clear
                  </button>
                </div>
              </label>
            </section>

            <AssigneePicker
              users={users}
              selectedUserId={assigneeId}
              currentUser={currentUser}
              onChange={setAssigneeId}
            />

            <WatchersPicker
              users={users}
              selectedUserIds={watcherIds}
              currentUser={currentUser}
              onChange={setWatcherIds}
            />

              <section className="issue-sidebar-section create-sidebar-actions">
              {error ? <p className="form-error">{error}</p> : null}
              <button className="button" type="button" onClick={() => navigate("/issues")}>
                Cancel
              </button>
              <button className="button button-primary" type="submit" disabled={saving || loadingData}>
                {saving ? "Creant..." : loadingData ? "Loading..." : "Create issue"}
              </button>
            </section>
            </aside>
          </div>
        </form>
      </main>
    </section>
  );
}
