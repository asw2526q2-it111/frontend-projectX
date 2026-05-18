import { Eye, UserCheck, UserMinus } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LoadingState } from "../components/LoadingState";
import { StatusPill } from "../components/StatusPill";
import {
  assignMe,
  createIssueComment,
  deleteIssueComment,
  getIssue,
  getIssueActivities,
  getIssueAttachments,
  getIssueComments,
  unassignMe,
  unwatchIssue,
  updateIssueComment,
  watchIssue,
} from "../api/issues";
import { EmptyState } from "../components/EmptyState";
import { useCurrentUser } from "../context/currentUser";
import { useAsync } from "../hooks/useAsync";
import { formatDate, initials } from "../utils/format";

export function IssueDetailPage() {
  const { issueId } = useParams();
  const { currentUser } = useCurrentUser();
  const [comment, setComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [commentActionError, setCommentActionError] = useState("");
  const [commentActionLoading, setCommentActionLoading] = useState(false);
  const [discussionView, setDiscussionView] = useState("comments"); //Per saber quina pestanya s'esta mostrant a discussion box

  const issueState = useAsync(() => getIssue(currentUser.apiKey, issueId), [
    currentUser.apiKey,
    issueId,
  ]);
  const attachmentsState = useAsync(
    () => getIssueAttachments(currentUser.apiKey, issueId),
    [currentUser.apiKey, issueId]
  );
  const commentsState = useAsync(() => getIssueComments(currentUser.apiKey, issueId), [
    currentUser.apiKey,
    issueId,
  ]);
  const activitiesState = useAsync(() => getIssueActivities(currentUser.apiKey, issueId), [
    currentUser.apiKey,
    issueId,
  ]);

  async function submitComment(event) {
    event.preventDefault();
    if (!comment.trim()) return;
    await createIssueComment(currentUser.apiKey, issueId, comment.trim());
    setComment("");
    await Promise.all([commentsState.reload(), activitiesState.reload()]);
  }

  function getActionErrorMessage(error, fallback) {
    if (error?.details?.detail) return String(error.details.detail);
    if (error instanceof Error && error.message) return error.message;
    return fallback;
  }

  function isCommentOwner(comment) {
    return comment.created_by?.username === currentUser.username;
  }

  function startEditingComment(comment) {
    setCommentActionError("");
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content);
  }

  function cancelEditingComment() {
    setCommentActionError("");
    setEditingCommentId(null);
    setEditingCommentContent("");
  }

  async function saveEditedComment(commentId) {
    const content = editingCommentContent.trim();
    if (!content) {
      setCommentActionError("El comentari no pot estar buit.");
      return;
    }

    setCommentActionLoading(true);
    setCommentActionError("");

    try {
      await updateIssueComment(currentUser.apiKey, commentId, content);
      cancelEditingComment();
      await Promise.all([commentsState.reload(), activitiesState.reload()]);
    } catch (error) {
      setCommentActionError(
        getActionErrorMessage(error, "No s'ha pogut guardar el comentari.")
      );
    } finally {
      setCommentActionLoading(false);
    }
  }

  async function removeComment(commentId) {
    if (!window.confirm("Vols eliminar aquest comentari?")) return;

    setCommentActionLoading(true);
    setCommentActionError("");

    try {
      await deleteIssueComment(currentUser.apiKey, commentId);
      if (String(editingCommentId) === String(commentId)) cancelEditingComment();
      await Promise.all([commentsState.reload(), activitiesState.reload()]);
    } catch (error) {
      setCommentActionError(
        getActionErrorMessage(error, "No s'ha pogut eliminar el comentari.")
      );
    } finally {
      setCommentActionLoading(false);
    }
  }

  function renderUserAvatar(user) {
    const userInitials = user.initials ?? initials(user.full_name ?? user.username);

    if (user.avatar) {
      return (
        <img className="avatar avatar--sm" src={user.avatar} alt={`Avatar de ${user.username}`} />
      );
    }

    return (
      <div className="avatar avatar--sm" aria-hidden="true">
        {userInitials}
      </div>
    );
  }

  function renderCommentItem(item) {
    const author = item.created_by;
    const isOwner = isCommentOwner(item);
    const isEditing = String(editingCommentId) === String(item.id);

    return (
      <article key={item.id} className="comment-item">
        <header className="comment-item__header">
          <div className="comment-item__author">
            {renderUserAvatar(author)}
            <strong>{author.full_name ?? author.username}</strong>
          </div>
          <div className="comment-item__meta">
            <time className="comment-item__date" dateTime={item.created_at}>
              {formatDate(item.created_at)}
            </time>
            {isOwner && !isEditing ? (
              <div className="comment-item__actions">
                <button
                  className="button comment-item__action"
                  type="button"
                  disabled={commentActionLoading}
                  onClick={() => startEditingComment(item)}
                >
                  Editar
                </button>
                <button
                  className="button comment-item__action comment-item__action--danger"
                  type="button"
                  disabled={commentActionLoading}
                  onClick={() => void removeComment(item.id)}
                >
                  Eliminar
                </button>
              </div>
            ) : null}
          </div>
        </header>

        {isEditing ? (
          <div className="comment-item__edit">
            <textarea
              value={editingCommentContent}
              onChange={(event) => setEditingCommentContent(event.target.value)}
              aria-label="Editar comentari"
            />
            <div className="comment-item__edit-actions">
              <button
                className="button button-primary"
                type="button"
                disabled={commentActionLoading}
                onClick={() => void saveEditedComment(item.id)}
              >
                Guardar
              </button>
              <button
                className="button"
                type="button"
                disabled={commentActionLoading}
                onClick={cancelEditingComment}
              >
                Cancel·lar
              </button>
            </div>
          </div>
        ) : (
          <p className="comment-item__content">{item.content}</p>
        )}
      </article>
    );
  }

  function getActivityUser(item) {
    return item.actor ?? item.user ?? item.created_by ?? null;
  }

  function renderActivityItem(item) {
    const author = getActivityUser(item);
    const authorName = author ? author.full_name ?? author.username : "Sistema";

    return (
      <article key={item.id} className="comment-item activity-item">
        <header className="comment-item__header">
          <div className="comment-item__author">
            {renderUserAvatar(author)}
            <strong>{authorName}</strong>
          </div>
          <div className="comment-item__meta">
            <time className="comment-item__date" dateTime={item.created_at}>
              {formatDate(item.created_at)}
            </time>
          </div>
        </header>
        <p className="comment-item__content">{item.summary}</p>
      </article>
    );
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

  function asList(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.results)) return payload.results;
    return [];
  }

  const attachmentItems = asList(attachmentsState.data);
  const comments = asList(commentsState.data);
  const activities = asList(activitiesState.data);

  function mainBox() {
    const creator = issue.created_by;
    const creatorInitials =
      creator.initials ?? initials(creator.full_name ?? creator.username);
    const createdAt = issue.date_created ?? issue.created_at;

    return (
      <section className="panel issue-detail-panel">
        <div className="issue-detail-panel__top">
          <div>
            <p className="main-title">#{issue.id} Issue</p>
            <h1 className="main-box__title">{issue.title}</h1>
          </div>
          <div className="main-box__creator">
            {renderUserAvatar(creator)}
            <div>
              <span className="main-box__creator-name">@{creator.username}</span>
              <time className="main-box__creator-date" dateTime={createdAt}>
                {formatDate(createdAt)}
              </time>
            </div>
          </div>
        </div>
        <p className="description-box">{issue.description || "Sense descripcio."}</p>
      </section>
    );
  }

  function attachmentsBox() {
    return (
      <section className="panel issue-detail-attachments-panel">
        <h2>Attachments</h2>
        <p>
          Allowed formats: PDF, images, TXT, MD, CSV, JSON, ZIP, DOC, DOCX, XLS, XLSX, PPT and PPTX.
          Max size: 10 MB.
        </p>
        <div className="attachment-list">
          {attachmentsState.loading ? (
            <p className="muted">Carregant adjunts…</p>
          ) : attachmentsState.error ? (
            <p className="form-error">{attachmentsState.error.message}</p>
          ) : attachmentItems.length > 0 ? (
            attachmentItems.map((attachment) => (
              <article className="attachment-item" key={attachment.id}>
                {attachment.file_name}
              </article>
            ))
          ) : (
            <p className="muted">No hi ha fitxers adjunts.</p>
          )}
        </div>
        <button className="button button-primary" type="button">
          Upload
        </button>
      </section>
    );
  }

  function discussionBox() {
    return (
      <section className="panel issue-detail-discussion-panel">
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
            Activitats
          </button>
          <br />
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
            {commentActionError ? (
              <p className="form-error comment-action-error">{commentActionError}</p>
            ) : null}
            <div className="comment-list">
              {commentsState.loading ? (
                <p className="muted">Carregant comentaris…</p>
              ) : commentsState.error ? (
                <p className="form-error">{commentsState.error.message}</p>
              ) : comments.length > 0 ? (
                comments.map((item) => renderCommentItem(item))
              ) : (
                <p className="muted">Encara no hi ha comentaris.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="discussion-panel" role="tabpanel">
            <br />
            <div className="comment-list">
              {activitiesState.loading ? (
                <p className="muted">Carregant activitats…</p>
              ) : activitiesState.error ? (
                <p className="form-error">{activitiesState.error.message}</p>
              ) : activities.length > 0 ? (
                activities.map((item) => renderActivityItem(item))
              ) : (
                <p className="muted">Encara no hi ha activitat.</p>
              )}
            </div>
          </div>
        )}
      </section>
    );
  }

  function lateralBox() {
    return (
      <section className="panel issue-detail-lateral-panel" aria-label="Issue metadata">
        {/* Status section */}
        {/* Assigned section */}
        {/* Watchers section */}
        {/* Buttons section */}
      </section>
    );
  }

  return (
    <div className="issue-workspace issue-detail-page">
      <Link className="button button-primary" to="/issues">
        Tornar a issues
      </Link>
      <br />

      <div className="issue-detail-body">
        <div className="issue-detail-layout">
          <div className="issue-detail-main page-stack">
            {mainBox()}
            {attachmentsBox()}
            {discussionBox()}
          </div>

          <aside className="right-panel issue-detail-sidebar">
            {lateralBox()}
          </aside>
        </div>
      </div>
    </div>
  );
}
