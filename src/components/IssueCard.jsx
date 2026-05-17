import { Link } from "react-router-dom";
import { CalendarDays, MessageSquareText, UserRound } from "lucide-react";
import { StatusPill } from "./StatusPill";
import { formatDate } from "../utils/format";

export function IssueCard({ issue }) {
  return (
    <article className="issue-card">
      <div className="issue-card__header">
        <Link to={`/issues/${issue.id}`} className="issue-card__title">
          #{issue.id} {issue.title}
        </Link>
        <StatusPill item={issue.status} />
      </div>

      <p className="issue-card__description">
        {issue.description || "Aquesta incidencia encara no te descripcio."}
      </p>

      <div className="issue-card__meta">
        <span>
          <UserRound size={16} aria-hidden="true" />
          {issue.assignee?.full_name ?? "Sense assignar"}
        </span>
        <span>
          <CalendarDays size={16} aria-hidden="true" />
          {formatDate(issue.deadline)}
        </span>
        <span>
          <MessageSquareText size={16} aria-hidden="true" />
          {issue.watchers.length} watchers
        </span>
      </div>

      <div className="issue-card__tags">
        <StatusPill item={issue.type} />
        <StatusPill item={issue.priority} />
        <StatusPill item={issue.severity} />
        {issue.tags.map((tag) => (
          <StatusPill key={tag.name} item={tag} />
        ))}
      </div>
    </article>
  );
}
