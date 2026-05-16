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
  const [discussionView, setDiscussionView] = useState("comments"); //Per saber quina pestanya s'esta mostrant a discussion box

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
  const attachments = issue.attachments ?? [];
  const comments = commentsState.data?.results ?? [];
  const activities = activitiesState.data?.results ?? [];

  function mainBox() {
    const creator = issue.created_by;
    const creatorInitials =
      creator.initials ?? initials(creator.full_name ?? creator.username);
    const createdAt = issue.date_created ?? issue.created_at;

    return (
      <div className="main-box">
        <h1 className="main-box__id">Issue #{issue.id}</h1>
        <h2 className="main-box__title">{issue.title}</h2>
        <p className="detail-description">{issue.description || "Sense descripcio."}</p>

        <div className="main-box__creator">
          {creator.avatar ? (
            <img
              className="avatar avatar--sm"
              src={creator.avatar}
              alt={`Avatar de ${creator.username}`}
            />
          ) : (
            <div className="avatar avatar--sm" aria-hidden="true">
              {creatorInitials}
            </div>
          )}
          <div>
            <span className="main-box__creator-name">@{creator.username}</span>
            <time className="main-box__creator-date" dateTime={createdAt}>
              {formatDate(createdAt)}
            </time>
          </div>
        </div>
      </div>
    );
  }

  function attachmentsBox() {
    return (
      <div className="attachments-box">
        <h3>Attachments</h3>
        <p>
          Allowed formats: PDF, images, TXT, MD, CSV, JSON, ZIP, DOC, DOCX, XLS, XLSX, PPT and PPTX.
          Max size: 10 MB.
        </p>
        <ul>
          {attachments.map((attachment) => (
            <li key={attachment.id}>{attachment.file_name}</li>
          ))}
        </ul>
        <button className="button button-primary" type="button">
          Upload
        </button>
      </div>
    );
  }

  function discussionBox() {
    return (
      <div className="discussion-box">
        <div className="discussion-tabs" role="tablist" aria-label="Discussions">
          <button
            className={`discussion-tab${discussionView === "comments" ? " discussion-tab--active" : ""}`}
            type="button"
            role="tab"
            aria-selected={discussionView === "comments"}
            onClick={() => setDiscussionView("comments")}
          >
            Comentaris
          </button>
          <button
            className={`discussion-tab${discussionView === "activities" ? " discussion-tab--active" : ""}`}
            type="button"
            role="tab"
            aria-selected={discussionView === "activities"}
            onClick={() => setDiscussionView("activities")}
          >
            Activitat
          </button>
        </div>

        {discussionView === "comments" ? (
          <div className="discussion-panel" role="tabpanel">
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
              {comments.map((item) => (
                <article key={item.id} className="activity-item">
                  <strong>{item.created_by.full_name}</strong>
                  <p>{item.content}</p>
                  <span>{formatDate(item.created_at)}</span>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="discussion-panel" role="tabpanel">
            <div className="activity-list">
              {activities.map((item) => (
                <article key={item.id} className="activity-item">
                  <strong>{item.summary}</strong>
                  <span>{formatDate(item.created_at)}</span>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function lateralBox() {
    //Status section
    //Assigned section
    //Watchers section
    //Buttons section
  }

  return (
    <section className="page-stack">
      <Link className="back-link" to="/issues">
        Tornar a issues
      </Link>

      {mainBox()}
      {attachmentsBox()}
      {discussionBox()}
    </section>
  );
}
