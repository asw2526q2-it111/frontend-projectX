import {
  CircleX,
  Clock3,
  Settings2,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { UserAvatar } from "../components/UserAvatar";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { listIssues } from "../api/issues";
import { useCurrentUser } from "../context/currentUser";
import { useAsync } from "../hooks/useAsync";
import { formatDate, initials } from "../utils/format";

const TABLE_SORTS = [
  { value: "type", label: "Type" },
  { value: "severity", label: "Severity" },
  { value: "priority", label: "Priority" },
  { value: "issue", label: "Issue" },
  { value: "status", label: "Status" },
  { value: "updated", label: "Modified" },
  { value: "assigned", label: "Assignee" },
];

export function IssuesPage() {
  const { currentUser } = useCurrentUser();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("updated");
  const [sortDirection, setSortDirection] = useState("desc");
  const [draftFilters, setDraftFilters] = useState(createEmptyFilters);
  const [selectedFilters, setSelectedFilters] = useState(createEmptyFilters);

  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      sort_by: sortBy,
      sort_direction: sortDirection,
    }),
    [search, sortBy, sortDirection]
  );

  const { data, error, loading, reload } = useAsync(
    () => listIssues(currentUser.apiKey, filters),
    [currentUser.apiKey, filters]
  );

  const issues = data?.results ?? [];

  const filterOptions = useMemo(
    () => ({
      status: collectNamedOptions(issues, (issue) => issue.status),
      type: collectNamedOptions(issues, (issue) => issue.type),
      priority: collectNamedOptions(issues, (issue) => issue.priority),
      severity: collectNamedOptions(issues, (issue) => issue.severity),
      tag: collectNamedOptions(issues, (issue) => issue.tags),
      assignedTo: collectUserOptions(issues, (issue) => issue.assignee),
      createdBy: collectUserOptions(issues, (issue) => issue.created_by),
    }),
    [issues]
  );

  const visibleIssues = useMemo(
    () =>
      issues.filter((issue) => {
        if (!matchesSingle(selectedFilters.status, issue.status)) return false;
        if (!matchesSingle(selectedFilters.type, issue.type)) return false;
        if (!matchesSingle(selectedFilters.priority, issue.priority)) return false;
        if (!matchesSingle(selectedFilters.severity, issue.severity)) return false;
        if (!matchesMany(selectedFilters.tag, issue.tags)) return false;
        if (!matchesSingle(selectedFilters.assignedTo, issue.assignee, buildUserKey)) return false;
        if (!matchesSingle(selectedFilters.createdBy, issue.created_by, buildUserKey)) return false;
        return true;
      }),
    [issues, selectedFilters]
  );

  const activeFilters = useMemo(
    () =>
      Object.entries(selectedFilters).flatMap(([group, values]) =>
        values.map((value) => ({
          group,
          value,
          label: `${FILTER_LABELS[group]}: ${findFilterLabel(filterOptions[group], value)}`,
        }))
      ),
    [filterOptions, selectedFilters]
  );

  const stats = useMemo(() => {
    const assigned = visibleIssues.filter((issue) => issue.assignee).length;
    return {
      total: visibleIssues.length,
      assigned,
      unassigned: visibleIssues.length - assigned,
    };
  }, [visibleIssues]);

  const recentIssues = useMemo(
    () =>
      [...visibleIssues]
        .sort((left, right) => new Date(right.updated_at) - new Date(left.updated_at))
        .slice(0, 4),
    [visibleIssues]
  );

  function submitSearch(event) {
    event.preventDefault();
    setSearch(searchInput);
  }

  function clearSearch() {
    setSearchInput("");
    setSearch("");
  }

  function toggleDraftFilter(group, optionId) {
    setDraftFilters((current) => {
      const values = current[group];
      const nextValues = values.includes(optionId)
        ? values.filter((value) => value !== optionId)
        : [...values, optionId];

      return {
        ...current,
        [group]: nextValues,
      };
    });
  }

  function applyFilters() {
    setSelectedFilters(draftFilters);
  }

  function clearFilters() {
    setDraftFilters(createEmptyFilters());
    setSelectedFilters(createEmptyFilters());
  }

  function handleSortChange(value) {
    if (value === sortBy) {
      setSortDirection((current) => (current === "desc" ? "asc" : "desc"));
      return;
    }

    setSortBy(value);
    setSortDirection("desc");
  }

  return (
    <div className="issue-workspace issue-list-page">
      <div className="app-bg-shape app-bg-shape-left" aria-hidden="true" />
      <div className="app-bg-shape app-bg-shape-right" aria-hidden="true" />

      <header className="topbar custom-topbar issue-topbar">
        <div className="brand issue-workspace-brand">
          <div className="brand-mark">IX</div>
          <div>
            <h1>Issue Hub</h1>
            <p>Focus mode for bug tracking and triage</p>
          </div>
        </div>

        <div className="topbar-search">
          <form className="issues-search-form" onSubmit={submitSearch}>
            <div className="issues-search-input-wrap">
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search issues..."
                aria-label="Search issues"
              />
              {searchInput ? (
                <button
                  className="issues-search-clear"
                  type="button"
                  aria-label="Clear search"
                  onClick={clearSearch}
                >
                  <CircleX size={16} aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <button className="button button-primary issue-search-button" type="submit">
              Search
            </button>
          </form>
        </div>

        <div className="topbar-profile">
          <Link className="button issue-profile-button" to={`/profile/${currentUser.username}`}>
            <UserAvatar
              user={{ username: currentUser.username, full_name: currentUser.fullName }}
              variant="topbar"
            />
            <span className="issue-profile-button__label">{currentUser.username}</span>
          </Link>
        </div>
      </header>

      <main className="layout issue-workspace-layout">
        <aside className="sidebar issue-list-sidebar">
          <section className="panel">
            <h2>Overview</h2>
            <ul className="stat-list">
              <li>
                <span>Total</span>
                <strong>{stats.total}</strong>
              </li>
              <li>
                <span>Assigned</span>
                <strong>{stats.assigned}</strong>
              </li>
              <li>
                <span>Unassigned</span>
                <strong>{stats.unassigned}</strong>
              </li>
            </ul>
          </section>

          <section className="panel filter-panel">
            <h2>Filters</h2>

            <FilterGroup
              title="Status"
              options={filterOptions.status}
              selectedValues={draftFilters.status}
              onToggle={(value) => toggleDraftFilter("status", value)}
            />
            <FilterGroup
              title="Type"
              options={filterOptions.type}
              selectedValues={draftFilters.type}
              onToggle={(value) => toggleDraftFilter("type", value)}
            />
            <FilterGroup
              title="Priority"
              options={filterOptions.priority}
              selectedValues={draftFilters.priority}
              onToggle={(value) => toggleDraftFilter("priority", value)}
            />
            <FilterGroup
              title="Severity"
              options={filterOptions.severity}
              selectedValues={draftFilters.severity}
              onToggle={(value) => toggleDraftFilter("severity", value)}
            />
            <FilterGroup
              title="Tags"
              options={filterOptions.tag}
              selectedValues={draftFilters.tag}
              onToggle={(value) => toggleDraftFilter("tag", value)}
            />
            <FilterGroup
              title="Assigned to"
              options={filterOptions.assignedTo}
              selectedValues={draftFilters.assignedTo}
              onToggle={(value) => toggleDraftFilter("assignedTo", value)}
            />
            <FilterGroup 
              title="Created by"
              options={filterOptions.createdBy}
              selectedValues={draftFilters.createdBy}
              onToggle={(value) => toggleDraftFilter("createdBy", value)}
            />

            <div className="filter-actions">
              <button className="button button-primary" type="button" onClick={applyFilters}>
                Apply
              </button>
              <button className="button issue-list-secondary-button" type="button" onClick={clearFilters}>
                Clear
              </button>
            </div>
          </section>

          <section className="panel">
            <h2>Recently updated</h2>
            <ul className="recent-list">
              {recentIssues.length > 0 ? (
                recentIssues.map((issue) => (
                  <li key={issue.id}>
                    <span className="recent-title">{issue.title}</span>
                    <span className="recent-date">{formatDate(issue.updated_at)}</span>
                  </li>
                ))
              ) : (
                <li className="muted">No issues yet.</li>
              )}
            </ul>
          </section>
        </aside>

        <section className="content panel issue-results-panel">
          <div className="content-header">
            <h2>
              Issues
              {activeFilters.length > 0 || search ? (
                <span className="results-count"> ({visibleIssues.length} results)</span>
              ) : null}
            </h2>
            <p>
              Sorted by {sortBy === "updated" ? "updated at" : sortBy} ({sortDirection})
            </p>
          </div>

          {activeFilters.length > 0 ? (
            <div className="active-filters">
              {activeFilters.map((filter) => (
                <span key={`${filter.group}-${filter.value}`} className="active-filter-tag">
                  {filter.label}
                </span>
              ))}
            </div>
          ) : null}

          {loading ? <LoadingState /> : null}
          {error ? (
            <EmptyState title="No s'han pogut carregar les issues" description={error.message} />
          ) : null}

          {!loading && !error && visibleIssues.length > 0 ? (
            <div className="issues-table-wrap">
              <div className="issues-table">
                <div className="issues-table-row issues-table-row--header">
                  {TABLE_SORTS.map((column, index) => (
                    <button
                      key={column.value}
                      className={`issues-table-head${sortBy === column.value ? " active" : ""}${
                        index <= 2 || index === 6 ? " issues-table-head--center" : ""
                      }`}
                      type="button"
                      onClick={() => handleSortChange(column.value)}
                    >
                      {column.label}
                      {sortBy === column.value ? (
                        <span className="issues-table-sort" aria-hidden="true">
                          {sortDirection === "asc" ? "\u25B2" : "\u25BC"}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>

                {visibleIssues.map((issue) => (
                  <IssueTableRow key={issue.id} issue={issue} />
                ))}
              </div>
            </div>
          ) : null}

          {!loading && !error && visibleIssues.length === 0 ? (
            <EmptyState
              title="No issues match this search"
              description="Try another search term or clear active filters."
            />
          ) : null}
        </section>

        <aside className="right-panel issue-list-right-panel">
          <section className="panel">
            <h2>Actions</h2>
            <div className="issue-list-actions">
              <Link className="button button-primary btn-full-center" to="/issues/new">
                + New issue
              </Link>
              <Link className="button btn-bulk btn-full-center" to="/bulk-insert">
                Bulk insert
              </Link>
            </div>
          </section>

          <section className="panel catalog-panel catalog-panel-centered">
            <h2 className="catalog-title">Configuration Hub</h2>
            <button className="button catalog-settings-btn btn-full-center" type="button">
              <Settings2 size={16} aria-hidden="true" />
              Open Settings
            </button>
          </section>
        </aside>
      </main>
    </div>
  );
}

function FilterGroup({ title, options, selectedValues, onToggle }) {
  return (
    <details className="filter-group" defaultOpen={(selectedValues?.length ?? 0) > 0}>
      <summary>{title}</summary>
      <div className="filter-options">
        {(options?.length ?? 0) > 0 ? (
          options.map((option) => (
            <label key={option.id}>
              <input
                type="checkbox"
                checked={selectedValues.includes(option.id)}
                onChange={() => onToggle(option.id)}
              />
              <span>{option.name}</span>
            </label>
          ))
        ) : (
          <span className="muted">No values available</span>
        )}
      </div>
    </details>
  );
}

function IssueTableRow({ issue }) {
  return (
    <div className="issues-table-row">
      <div className="issues-table-cell issues-table-cell--dot">
        <ColorDot item={issue.type} titlePrefix="Type" />
      </div>
      <div className="issues-table-cell issues-table-cell--dot">
        <ColorDot item={issue.severity} titlePrefix="Severity" />
      </div>
      <div className="issues-table-cell issues-table-cell--dot">
        <ColorDot item={issue.priority} titlePrefix="Priority" />
      </div>
      <div className="issues-table-cell issues-table-cell--issue">
        <Link className="issue-table-link" to={`/issues/${issue.id}`}>
          <span className="issue-table-id">#{issue.id}</span>
          <span className="issue-table-title">{issue.title}</span>
        </Link>
        <span className="issue-table-icons">
          {issue.deadline ? (
            <Clock3
              className="issue-deadline-icon"
              size={16}
              color={deadlineColor(issue.deadline)}
              aria-label={`Deadline: ${formatDate(issue.deadline)}`}
            />
          ) : null}
        </span>
      </div>
      <div className="issues-table-cell issues-table-cell--status">
        {issue.status ? (
          <span className="issue-table-status" style={{ color: issue.status.color }} title={issue.status.name}>
            {issue.status.name}
          </span>
        ) : (
          <span className="issue-table-status issue-table-status--empty">-</span>
        )}
      </div>
      <div className="issues-table-cell issues-table-cell--modified">{formatDate(issue.updated_at)}</div>
      <div className="issues-table-cell issues-table-cell--assignee">
        {issue.assignee ? (
          <Link className="issue-assignee-link" to={`/profile/${issue.assignee.username}`}>
            <span className="issue-assignee-avatar issue-assignee-avatar--initials">
              {initials(issue.assignee.full_name)}
            </span>
          </Link>
        ) : (
          <span className="issue-assignee-avatar issue-assignee-avatar--empty" title="Unassigned">
            <TriangleAlert size={14} aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  );
}

function ColorDot({ item, titlePrefix }) {
  if (!item?.color) {
    return <span className="issue-list-dot issue-list-dot--empty" title={`${titlePrefix}: -`} />;
  }

  return (
    <span
      className="issue-list-dot"
      style={{ background: item.color }}
      title={`${titlePrefix}: ${item.name}`}
    />
  );
}

function collectNamedOptions(issues, pickItems) {
  const entries = new Map();

  issues.forEach((issue) => {
    const value = pickItems(issue);
    const items = Array.isArray(value) ? value : value ? [value] : [];

    items.forEach((item) => {
      const key = buildItemKey(item);
      if (!key || entries.has(key)) return;
      entries.set(key, {
        id: key,
        name: item.name ?? "No value",
      });
    });
  });

  return [...entries.values()].sort((left, right) => left.name.localeCompare(right.name, "en"));
}

function buildItemKey(item) {
  if (!item) return "";
  return String(item.id ?? item.name ?? "");
}

function collectUserOptions(issues, pickUser) {
  const entries = new Map();

  issues.forEach((issue) => {
    const user = pickUser(issue);
    const key = buildUserKey(user);

    if (!key || entries.has(key)) return;

    entries.set(key, {
      id: key,
      name: user.username ?? user.full_name ?? "Unknown user",
    });
  });

  return [...entries.values()].sort((left, right) => left.name.localeCompare(right.name, "en"));
}

function buildUserKey(user) {
  if (!user) return "";
  return String(user.username ?? user.id ?? "");
}

function matchesMany(selectedValues, items = []) {
  if (selectedValues.length === 0) return true;
  const values = items.map(buildItemKey);
  return selectedValues.every((selectedValue) => values.includes(selectedValue));
}

function matchesSingle(selectedValues, item, buildKey = buildItemKey) {
  if (selectedValues.length === 0) return true;
  return selectedValues.includes(buildKey(item));
}

function findFilterLabel(options = [], value) {
  return options.find((option) => option.id === value)?.name ?? value;
}

function deadlineColor(value) {
  const today = new Date();
  const deadline = new Date(value);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.ceil((deadline - today) / msPerDay);

  if (daysLeft < 0) return "#dc2626";
  if (daysLeft <= 3) return "#f59e0b";
  return "#94a3b8";
}

function createEmptyFilters() {
  return {
    status: [],
    priority: [],
    severity: [],
    type: [],
    tag: [],
    assignedTo: [],
    createdBy: [],
  };
}

const FILTER_LABELS = {
  status: "Status",
  type: "Type",
  priority: "Priority",
  severity: "Severity",
  tag: "Tag",
  assignedTo: "Assigned",
  createdBy: "Creator",
};
