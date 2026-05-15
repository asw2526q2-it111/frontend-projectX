import { Eye, UserCheck, UserMinus } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LoadingState } from "../components/LoadingState";
import { StatusPill } from "../components/StatusPill";
import {
  assignMe,
  createIssueComment,
  getIssue,
  listIssueActivities,
  listIssueComments,
  unassignMe,
  unwatchIssue,
  watchIssue,
} from "../api/issues";
import { EmptyState } from "../components/EmptyState";
import { useCurrentUser } from "../context/currentUser";
import { useAsync } from "../hooks/useAsync";
import { formatDate } from "../utils/format";

export function IssueDetailPage() {
  const { issueId } = useParams();
  const { currentUser } = useCurrentUser();
  const [comment, setComment] = useState("");

  const issueState = useAsync(() => getIssue(currentUser.apiKey, issueId), [
    currentUser.apiKey,
    issueId,
  ]);
  const commentsState = useAsync(() => listIssueComments(currentUser.apiKey, issueId), [
    currentUser.apiKey,
    issueId,
  ]);
  const activitiesState = useAsync(() => listIssueActivities(currentUser.apiKey, issueId), [
    currentUser.apiKey,
    issueId,
  ]);

  async function runIssueAction(action) {
    await action();
    await issueState.reload();
  }

  async function submitComment(event) {
    event.preventDefault();
    if (!comment.trim()) return;
    await createIssueComment(currentUser.apiKey, issueId, comment.trim());
    setComment("");
    await commentsState.reload();
  }

  if (issueState.loading) return <LoadingState />;

  if (issueState.error || !issueState.data) {
    return (
      <EmptyState
        title="No s'ha pogut carregar la issue"
        description={issueState.error?.message ?? "Issue no trobada."}
      />
    );
  }

  const issue = issueState.data;
  const isWatchedByCurrentUser = issue.watchers.some(
    (watcher) => watcher.username === currentUser.username
  );

  return (
    <section className="page-stack">
      <Link className="back-link" to="/issues">
        Tornar a issues
      </Link>

      <article className="detail-panel">
        <div className="detail-panel__header">
          <div>
            <span className="eyebrow">Issue #{issue.id}</span>
            <h2>{issue.title}</h2>
          </div>
          <StatusPill item={issue.status} />
        </div>

        <p className="detail-description">{issue.description || "Sense descripcio."}</p>

        <div className="detail-grid">
          <Info label="Creador" value={issue.created_by.full_name} />
          <Info label="Assignat" value={issue.assignee?.full_name ?? "Sense assignar"} />
          <Info label="Deadline" value={formatDate(issue.deadline)} />
          <Info label="Actualitzat" value={formatDate(issue.updated_at)} />
        </div>

        <div className="issue-card__tags">
          <StatusPill item={issue.type} />
          <StatusPill item={issue.priority} />
          <StatusPill item={issue.severity} />
          {issue.tags.map((tag) => (
            <StatusPill key={tag.name} item={tag} />
          ))}
        </div>

        <div className="actions">
          <button
            className="button"
            type="button"
            onClick={() => void runIssueAction(() => assignMe(currentUser.apiKey, issue.id))}
          >
            <UserCheck size={17} aria-hidden="true" />
            Assignar-me
          </button>
          <button
            className="button"
            type="button"
            onClick={() => void runIssueAction(() => unassignMe(currentUser.apiKey, issue.id))}
          >
            <UserMinus size={17} aria-hidden="true" />
            Desassignar-me
          </button>
          <button
            className="button"
            type="button"
            onClick={() =>
              void runIssueAction(() =>
                isWatchedByCurrentUser
                  ? unwatchIssue(currentUser.apiKey, issue.id)
                  : watchIssue(currentUser.apiKey, issue.id)
              )
            }
          >
            <Eye size={17} aria-hidden="true" />
            {isWatchedByCurrentUser ? "Deixar de seguir" : "Seguir"}
          </button>
        </div>
      </article>

      <section className="split-grid">
        <div className="panel">
          <h3>Comentaris</h3>
          <form className="comment-form" onSubmit={submitComment}>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Escriu un comentari"
            />
            <button className="button button-primary" type="submit">
              Publicar
            </button>
          </form>
          <div className="activity-list">
            {commentsState.data?.results.map((item) => (
              <article key={item.id} className="activity-item">
                <strong>{item.created_by.full_name}</strong>
                <p>{item.content}</p>
                <span>{formatDate(item.created_at)}</span>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Activitat</h3>
          <div className="activity-list">
            {activitiesState.data?.results.map((item) => (
              <article key={item.id} className="activity-item">
                <strong>{item.summary}</strong>
                <span>{formatDate(item.created_at)}</span>
              </article>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}

function Info({ label, value }) {
  return (
    <div className="info-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
