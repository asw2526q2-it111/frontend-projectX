import { Clock3, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getUserIssues } from "../api/users";
import { useCurrentUser } from "../context/currentUser";
import { useAsync } from "../hooks/useAsync";
import { formatDate } from "../utils/format";
import { normalizePagedList } from "../utils/apiList";
import { getUserAvatarUrl, getUserInitials } from "../utils/user";
import { EmptyState } from "./EmptyState";
import { LoadingState } from "./LoadingState";

const PROFILE_TABLE_SORTS = [
  { value: "type", label: "Type", centered: true },
  { value: "severity", label: "Severity", centered: true },
  { value: "priority", label: "Priority", centered: true },
  { value: "issue", label: "Issue" },
  { value: "status", label: "Status" },
  { value: "updated", label: "Modified" },
  { value: "assignee", label: "Assignee", centered: true, sortable: false },
];

export function ProfileIssuesTable({ username, type, profileUser }) {
  const { currentUser } = useCurrentUser();
  const [sortBy, setSortBy] = useState("updated");
  const [sortDirection, setSortDirection] = useState("desc");

  const issuesState = useAsync(
    () =>
      getUserIssues(currentUser?.apiKey, username, type, {
        sort_by: sortBy,
        sort_direction: sortDirection,
      }),
    [currentUser?.apiKey, username, type, sortBy, sortDirection]
  );

  const issues = useMemo(() => normalizePagedList(issuesState.data), [issuesState.data]);

  function handleSortChange(value, sortable = true) {
    if (!sortable) return;

    if (value === sortBy) {
      setSortDirection((current) => (current === "desc" ? "asc" : "desc"));
      return;
    }

    setSortBy(value);
    setSortDirection("desc");
  }

  if (issuesState.loading) {
    return <LoadingState />;
  }

  if (issuesState.error) {
    return (
      <EmptyState
        title="The issues couldn't be loaded"
        description={issuesState.error.message}
      />
    );
  }

  if (issues.length === 0) {
    return (
      <EmptyState
        title="No issues found"
        description="This user has no issues in this tab."
      />
    );
  }

  return (
    <div className="issues-table-wrap">
      <div className="issues-table">
        <div className="issues-table-row issues-table-row--header">
          {PROFILE_TABLE_SORTS.map((column) => {
            const sortable = column.sortable !== false;
            const className = `issues-table-head${
              sortBy === column.value && sortable ? " active" : ""
            }${column.centered ? " issues-table-head--center" : ""}`;

            if (!sortable) {
              return (
                <div key={column.value} className={className} aria-hidden="true">
                  {column.label}
                </div>
              );
            }

            return (
              <button
                key={column.value}
                className={className}
                type="button"
                onClick={() => handleSortChange(column.value, sortable)}
              >
                {column.label}
                {sortBy === column.value ? (
                  <span className="issues-table-sort" aria-hidden="true">
                    {sortDirection === "asc" ? "\u25B2" : "\u25BC"}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {issues.map((issue) => (
          <ProfileIssueTableRow
            key={issue.id}
            issue={issue}
            type={type}
            profileUser={profileUser}
          />
        ))}
      </div>
    </div>
  );
}

function ProfileIssueTableRow({ issue, type, profileUser }) {
  const assigneeUser = type === "assigned" ? profileUser ?? issue.assignee : issue.assignee;

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
          <span className="issue-table-status" style={{ color: issue.status.color }}>
            {issue.status.name}
          </span>
        ) : (
          <span className="issue-table-status issue-table-status--empty">-</span>
        )}
      </div>
      <div className="issues-table-cell issues-table-cell--modified">
        {formatDate(issue.updated_at)}
      </div>
      <div className="issues-table-cell issues-table-cell--assignee">
        <AssigneeAvatar user={assigneeUser} />
      </div>
    </div>
  );
}

function AssigneeAvatar({ user }) {
  if (!user?.username) {
    return (
      <span className="issue-assignee-avatar issue-assignee-avatar--empty" title="Unassigned">
        <TriangleAlert size={14} aria-hidden="true" />
      </span>
    );
  }

  const avatarUrl = getUserAvatarUrl(user);
  const initials = getUserInitials(user);

  return (
    <Link className="issue-assignee-link" to={`/profile/${user.username}`} title={`@${user.username}`}>
      {avatarUrl ? (
        <img className="issue-assignee-avatar" src={avatarUrl} alt={`${user.username}'s avatar`} />
      ) : (
        <span className="issue-assignee-avatar issue-assignee-avatar--initials">{initials}</span>
      )}
    </Link>
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

function deadlineColor(deadline) {
  const remaining = new Date(deadline).getTime() - Date.now();
  const day = 24 * 60 * 60 * 1000;

  if (remaining <= 0) return "#dc2626";
  if (remaining <= 3 * day) return "#f97316";
  if (remaining <= 7 * day) return "#f59e0b";
  return "#0f766e";
}
