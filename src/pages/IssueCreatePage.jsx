import { Check, ChevronDown, Plus, UserCheck, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createIssue } from "../api/issues";
import { createLookup, listLookup } from "../api/lookups";
import { listUsers } from "../api/users";
import { useCurrentUser } from "../context/currentUser";
import { initials } from "../utils/format";
import { getUserDisplayName, getUserInitials } from "../utils/user";

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

function normalizeIdentity(value) {
  return String(value ?? "").trim().toLowerCase();
}

function createCurrentUserFallback(currentUser) {
  const fullName = getUserDisplayName(currentUser) || "User";

  return {
    username: currentUser?.username || "",
    full_name: fullName,
    fullName,
    initials: currentUser?.initials ?? initials(fullName),
    avatar_url: "",
  };
}

function findCurrentApiUser(users, currentUser) {
  const targetUsername = normalizeIdentity(currentUser?.username);
  const targetFullName = normalizeIdentity(currentUser?.fullName);

  return (
    users.find((user) => {
      const username = normalizeIdentity(user.username);
      const fullName = normalizeIdentity(user.full_name || user.fullName);
      return (targetUsername && username === targetUsername) || (targetFullName && fullName === targetFullName);
    }) ?? null
  );
}

function getCurrentDraftUser(users, currentUser) {
  const matchedUser = findCurrentApiUser(users, currentUser);

  if (matchedUser) return matchedUser;

  const fallbackUser = createCurrentUserFallback(currentUser);
  return fallbackUser.username ? fallbackUser : null;
}

function findUserByUsername(users, username, currentUser) {
  const normalizedUsername = normalizeIdentity(username);
  if (!normalizedUsername) return null;

  const matchedUser = users.find((user) => normalizeIdentity(user.username) === normalizedUsername);
  if (matchedUser) return matchedUser;

  const fallbackUser = getCurrentDraftUser(users, currentUser);
  if (fallbackUser && normalizeIdentity(fallbackUser.username) === normalizedUsername) return fallbackUser;

  return null;
}

function mapUsernamesToUsers(usernames, users, currentUser) {
  const seen = new Set();

  return usernames
    .map((username) => findUserByUsername(users, username, currentUser))
    .filter((user) => {
      const normalizedUsername = normalizeIdentity(user?.username);
      if (!normalizedUsername || seen.has(normalizedUsername)) return false;
      seen.add(normalizedUsername);
      return true;
    });
}

function UserAvatar({ user, size = "md" }) {
  const className = `create-user-avatar create-user-avatar--${size}`;

  if (user?.avatar_url) {
    return <img className={className} src={user.avatar_url} alt={`${user.username}'s avatar`} />;
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

function PickerContainer({ className = "", isOpen, onToggle, summary, children }) {
  return (
    <div
      className={`create-picker${isOpen ? " is-open" : ""}${className ? ` ${className}` : ""}`}
      data-create-picker-root="true"
    >
      <button
        className="create-picker-summary"
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={onToggle}
      >
        {summary}
        <ChevronDown className="create-picker-chevron" size={16} aria-hidden="true" />
      </button>
      {isOpen ? <div className="create-picker-menu">{children}</div> : null}
    </div>
  );
}

function LookupDropdown({ label, value, options, isOpen, onToggle, onClose, onChange, onCreate }) {
  const selected = options.find((option) => option.name === value);

  function handleSelect(optionName) {
    onChange(optionName);
    onClose();
  }

  return (
    <div className="create-field">
      <span className="create-label">{label}</span>
      <PickerContainer
        isOpen={isOpen}
        onToggle={onToggle}
        summary={
          <span className="create-picker-value">
            <ColorDot color={selected?.color} />
            <span>{selected?.name || `Select ${label.toLowerCase()}`}</span>
          </span>
        }
      >
        {options.map((option) => (
          <button
            className={`create-picker-option${option.name === value ? " is-selected" : ""}`}
            key={option.name}
            type="button"
            onClick={() => handleSelect(option.name)}
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
      </PickerContainer>
    </div>
  );
}

function TagPicker({ options, selectedTags, isOpen, onToggle, onAdd, onRemove, onCreate }) {
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

        <PickerContainer
          className="create-picker--tags"
          isOpen={isOpen}
          onToggle={onToggle}
          summary={<span>Add tag</span>}
        >
          {availableOptions.length > 0 ? (
            availableOptions.map((tag) => (
              <button className="create-picker-option" key={tag.name} type="button" onClick={() => onAdd(tag.name)}>
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
        </PickerContainer>
      </div>
    </div>
  );
}

function AssigneePicker({ users, selectedUsername, currentUser, isOpen, onToggle, onClose, onChange }) {
  const selectedUser = findUserByUsername(users, selectedUsername, currentUser);
  const currentDraftUser = getCurrentDraftUser(users, currentUser);
  const isAssignedToCurrentUser =
    currentDraftUser &&
    normalizeIdentity(currentDraftUser.username) === normalizeIdentity(selectedUsername);

  function handleAssigneeChange(nextUsername) {
    onChange(nextUsername);
    onClose();
  }

  return (
    <section className="issue-sidebar-section">
      <div className="issue-people-header">
        <h3 className="issue-sidebar-title">Assigned</h3>
        <button
          className={`button create-section-action${isAssignedToCurrentUser ? " button-danger-outline" : ""}`}
          type="button"
          disabled={!currentDraftUser?.username}
          onClick={() => handleAssigneeChange(isAssignedToCurrentUser ? "" : currentDraftUser.username)}
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

      <PickerContainer
        className="create-picker--people"
        isOpen={isOpen}
        onToggle={onToggle}
        summary={<span>{selectedUser ? "Change assignee" : "Select assignee"}</span>}
      >
        <button
          className={`create-user-option${!selectedUsername ? " is-selected" : ""}`}
          type="button"
          onClick={() => handleAssigneeChange("")}
        >
          <span className="create-user-avatar create-user-avatar--sm create-user-avatar--empty">-</span>
          <span className="create-user-copy">
            <strong>Unassigned</strong>
            <small>No assignee</small>
          </span>
          {!selectedUsername ? <Check size={15} aria-hidden="true" /> : null}
        </button>
        {users.map((user) => (
          <button
            className={`create-user-option${
              normalizeIdentity(user.username) === normalizeIdentity(selectedUsername) ? " is-selected" : ""
            }`}
            key={user.username}
            type="button"
            onClick={() => handleAssigneeChange(user.username)}
          >
            <UserAvatar user={user} size="sm" />
            <span className="create-user-copy">
              <strong>{getDisplayName(user)}</strong>
              <small>@{user.username}</small>
            </span>
            {normalizeIdentity(user.username) === normalizeIdentity(selectedUsername) ? (
              <Check size={15} aria-hidden="true" />
            ) : null}
          </button>
        ))}
      </PickerContainer>
    </section>
  );
}

function WatchersPicker({ users, selectedUsernames, currentUser, isOpen, onToggle, onChange }) {
  const currentDraftUser = getCurrentDraftUser(users, currentUser);
  const selectedSet = new Set(selectedUsernames.map(normalizeIdentity));
  const selectedUsers = mapUsernamesToUsers(selectedUsernames, users, currentUser);
  const currentUserIsWatching =
    currentDraftUser && selectedSet.has(normalizeIdentity(currentDraftUser.username));

  function toggleUser(username) {
    const normalizedUsername = normalizeIdentity(username);
    if (!normalizedUsername) return;

    if (selectedSet.has(normalizedUsername)) {
      onChange(
        selectedUsernames.filter((selectedUsername) => normalizeIdentity(selectedUsername) !== normalizedUsername)
      );
      return;
    }

    onChange([...selectedUsernames, username]);
  }

  return (
    <section className="issue-sidebar-section">
      <div className="issue-people-header">
        <h3 className="issue-sidebar-title">Watchers</h3>
        <button
          className={`button create-section-action${currentUserIsWatching ? " button-danger-outline" : ""}`}
          type="button"
          disabled={!currentDraftUser?.username}
          onClick={() => toggleUser(currentDraftUser.username)}
        >
          {currentUserIsWatching ? "Unwatch" : "Watch me"}
        </button>
      </div>

      {selectedUsers.length > 0 ? (
        <div className="create-person-list">
          {selectedUsers.map((user) => (
            <div className="create-person-card" key={user.username}>
              <UserAvatar user={user} size="sm" />
              <div>
                <strong>{getDisplayName(user)}</strong>
                <span>@{user.username}</span>
              </div>
              <button type="button" onClick={() => toggleUser(user.username)} aria-label={`Remove ${user.username}`}>
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="create-empty-text">No watchers yet.</p>
      )}

      <PickerContainer
        className="create-picker--people"
        isOpen={isOpen}
        onToggle={onToggle}
        summary={<span>Select watchers{selectedUsers.length ? ` (${selectedUsers.length})` : ""}</span>}
      >
        {users.length > 0 ? (
          users.map((user) => {
            const isSelected = selectedSet.has(normalizeIdentity(user.username));

            return (
              <button
                className={`create-user-option${isSelected ? " is-selected" : ""}`}
                key={user.username}
                type="button"
                onClick={() => toggleUser(user.username)}
              >
                <UserAvatar user={user} size="sm" />
                <span className="create-user-copy">
                  <strong>{getDisplayName(user)}</strong>
                  <small>@{user.username}</small>
                </span>
                <span className={`create-user-check${isSelected ? " is-selected" : ""}`} aria-hidden="true">
                  {isSelected ? <Check size={13} aria-hidden="true" /> : null}
                </span>
              </button>
            );
          })
        ) : (
          <span className="create-picker-empty">No users available.</span>
        )}
      </PickerContainer>
    </section>
  );
}

function LookupCreateModal({ target, values, saving, error, onChange, onCancel, onSubmit }) {
  const nameInputRef = useRef(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event) {
      if (event.key !== "Escape" || saving) return;
      event.preventDefault();
      onCancel();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel, saving]);

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <div className="lookup-modal-backdrop" role="presentation" onClick={() => !saving && onCancel()}>
      <section
        className="lookup-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Create ${target.label.toLowerCase()}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="lookup-modal-header">
          <div>
            <span className="eyebrow">New {target.label}</span>
            <h3>Create {target.label.toLowerCase()}</h3>
          </div>
          <button
            className="lookup-modal-close"
            type="button"
            onClick={onCancel}
            disabled={saving}
            aria-label={`Close ${target.label.toLowerCase()} dialog`}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form className="lookup-modal-body" onSubmit={handleSubmit}>
          <div className="lookup-modal-grid">
            <label className="create-field">
              <span className="create-label">Name</span>
              <input
                ref={nameInputRef}
                type="text"
                value={values.name}
                onChange={(event) => onChange({ ...values, name: event.target.value })}
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

          <div className="lookup-modal-actions">
            <button className="button" type="button" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </section>
    </div>
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
  const [assigneeUsername, setAssigneeUsername] = useState("");
  const [watcherUsernames, setWatcherUsernames] = useState([]);
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
  const [openPicker, setOpenPicker] = useState(null);

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
          setLoadError(getErrorMessage(loadDataError, "The form data couldn't be loaded."));
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

  useEffect(() => {
    if (!openPicker) return undefined;

    function handlePointerDown(event) {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest("[data-create-picker-root='true']")) return;
      setOpenPicker(null);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpenPicker(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [openPicker]);

  function togglePicker(pickerKey) {
    setOpenPicker((current) => (current === pickerKey ? null : pickerKey));
  }

  function closePicker() {
    setOpenPicker(null);
  }

  function updateMetadata(key, value) {
    setMetadata((current) => ({ ...current, [key]: value }));
  }

  function openLookupCreate(target) {
    closePicker();
    setCreateTarget(target);
    setCreateValues({ name: "", color: target.color, is_closed: false });
    setCreateLookupError("");
  }

  function closeLookupCreate() {
    if (creatingLookup) return;
    setCreateTarget(null);
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
        setSelectedTags((current) => (current.includes(created.name) ? current : [...current, created.name]));
      } else {
        updateMetadata(createTarget.key, created.name);
      }

      setCreateTarget(null);
    } catch (lookupError) {
      setCreateLookupError(getErrorMessage(lookupError, "Could not create the item."));
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
        assignee_username: assigneeUsername || null,
        watcher_usernames: watcherUsernames,
      });
      navigate(`/issues/${issue.id}`);
    } catch (submitError) {
      setError(getErrorMessage(submitError, "The issue couldn't be created."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="issue-create-page">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">IX</div>
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
                    <span className="create-label">
                      Title <strong>*</strong>
                    </span>
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
                    isOpen={openPicker === "tag"}
                    onToggle={() => togglePicker("tag")}
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
                    isOpen={openPicker === group.key}
                    onToggle={() => togglePicker(group.key)}
                    onClose={closePicker}
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
                    <input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
                    <button className="button" type="button" onClick={() => setDeadline("")}>
                      Clear
                    </button>
                  </div>
                </label>
              </section>

              <AssigneePicker
                users={users}
                selectedUsername={assigneeUsername}
                currentUser={currentUser}
                isOpen={openPicker === "assignee"}
                onToggle={() => togglePicker("assignee")}
                onClose={closePicker}
                onChange={setAssigneeUsername}
              />

              <WatchersPicker
                users={users}
                selectedUsernames={watcherUsernames}
                currentUser={currentUser}
                isOpen={openPicker === "watchers"}
                onToggle={() => togglePicker("watchers")}
                onChange={setWatcherUsernames}
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

      {createTarget ? (
        <LookupCreateModal
          target={createTarget}
          values={createValues}
          saving={creatingLookup}
          error={createLookupError}
          onChange={setCreateValues}
          onCancel={closeLookupCreate}
          onSubmit={handleCreateLookup}
        />
      ) : null}
    </section>
  );
}
