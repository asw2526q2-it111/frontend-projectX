import { Eye, UserCheck, UserMinus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { StatusPill } from "../components/StatusPill";
import {
  applyAssignee,
  applyWatchers,
  assignMe,
  createIssueComment,
  deleteIssueComment,
  getIssue,
  listIssueActivities,
  listIssueComments,
  unassignMe,
  unwatchIssue,
  updateIssueComment,
  watchIssue,
} from "../api/issues";
import { listUsers } from "../api/users";
import { useCurrentUser } from "../context/currentUser";
import { useAsync } from "../hooks/useAsync";
import { formatDate, initials } from "../utils/format";

function getResults(payload) {
  return Array.isArray(payload?.results) ? payload.results : [];
}

function normalizeIdentity(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getActionErrorMessage(error, fallback) {
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

function createCurrentUserFallback(currentUser) {
  const fullName = currentUser?.fullName || currentUser?.username || "User";

  return {
    username: currentUser?.username || "",
    full_name: fullName,
    initials: initials(fullName),
    avatar_url: "",
  };
}

function findCurrentApiUser(users, currentUser) {
  const targetUsername = normalizeIdentity(currentUser?.username);
  const targetFullName = normalizeIdentity(currentUser?.fullName);

  return (
    users.find((user) => {
      const username = normalizeIdentity(user.username);
      const fullName = normalizeIdentity(user.full_name);
      return (targetUsername && username === targetUsername) || (targetFullName && fullName === targetFullName);
    }) ?? createCurrentUserFallback(currentUser)
  );
}

function renderUserAvatar(user) {
  const userInitials = user.initials ?? initials(user.full_name ?? user.username);
  const avatarUrl = user.avatar_url || user.avatar;

  if (avatarUrl) {
    return <img className="avatar avatar--sm" src={avatarUrl} alt={`Avatar de ${user.username}`} />;
  }

  return (
    <div className="avatar avatar--sm" aria-hidden="true">
      {userInitials}
    </div>
  );
}

export function IssueDetailPage() {
  const { issueId } = useParams();
  const { currentUser } = useCurrentUser();
  const [comment, setComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [commentActionError, setCommentActionError] = useState("");
  const [commentActionLoading, setCommentActionLoading] = useState(false);
  const [discussionView, setDiscussionView] = useState("comments");
  const [issueActionError, setIssueActionError] = useState("");
  const [issueActionLoading, setIssueActionLoading] = useState(false);
  const [assigneeSelection, setAssigneeSelection] = useState("");
  const [watcherSelection, setWatcherSelection] = useState([]);

  const issueState = useAsync(() => getIssue(currentUser.apiKey, issueId), [currentUser.apiKey, issueId]);
  const commentsState = useAsync(() => listIssueComments(currentUser.apiKey, issueId), [currentUser.apiKey, issueId]);
  const activitiesState = useAsync(() => listIssueActivities(currentUser.apiKey, issueId), [
    currentUser.apiKey,
    issueId,
  ]);
  const usersState = useAsync(() => listUsers(currentUser.apiKey), [currentUser.apiKey]);

  useEffect(() => {
    if (!issueState.data) return;

    setAssigneeSelection(issueState.data.assignee?.username ?? "");
    setWatcherSelection((issueState.data.watchers ?? []).map((watcher) => watcher.username));
  }, [issueState.data]);

  async function runIssueAction(action, fallback) {
    setIssueActionLoading(true);
    setIssueActionError("");

    try {
      await action();
      await issueState.reload();
      void activitiesState.reload();
    } catch (error) {
      setIssueActionError(getActionErrorMessage(error, fallback));
    } finally {
      setIssueActionLoading(false);
    }
  }

  async function submitComment(event) {
    event.preventDefault();
    if (!comment.trim()) return;
    await createIssueComment(currentUser.apiKey, issueId, comment.trim());
    setComment("");
    await commentsState.reload();
  }

  function isCommentOwner(commentItem) {
    return commentItem.created_by?.username === currentUser.username;
  }

  function startEditingComment(commentItem) {
    setCommentActionError("");
    setEditingCommentId(commentItem.id);
    setEditingCommentContent(commentItem.content);
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
      await commentsState.reload();
    } catch (error) {
      setCommentActionError(getActionErrorMessage(error, "No s'ha pogut guardar el comentari."));
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
      await commentsState.reload();
    } catch (error) {
      setCommentActionError(getActionErrorMessage(error, "No s'ha pogut eliminar el comentari."));
    } finally {
      setCommentActionLoading(false);
    }
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
                Cancelar
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
            {author ? (
              renderUserAvatar(author)
            ) : (
              <div className="avatar avatar--sm" aria-hidden="true">
                S
              </div>
            )}
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

  if (issueState.loading && !issueState.data) return <LoadingState />;

  if ((issueState.error && !issueState.data) || !issueState.data) {
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
  const users = getResults(usersState.data);
  const currentApiUser = findCurrentApiUser(users, currentUser);
  const isAssignedToCurrentUser =
    normalizeIdentity(issue.assignee?.username) === normalizeIdentity(currentApiUser.username);
  const isCurrentUserWatching = (issue.watchers ?? []).some(
    (watcher) => normalizeIdentity(watcher.username) === normalizeIdentity(currentApiUser.username)
  );

  function mainBox() {
    const creator = issue.created_by;
    const creatorInitials = creator.initials ?? initials(creator.full_name ?? creator.username);
    const creatorAvatarUrl = creator.avatar_url || creator.avatar;
    const createdAt = issue.date_created ?? issue.created_at;

    return (
      <section className="panel issue-detail-panel">
        <div className="issue-detail-panel__top">
          <div>
            <p className="main-title">#{issue.id} Issue</p>
            <h1 className="main-box__title">{issue.title}</h1>
          </div>
          <div className="main-box__creator">
            {creatorAvatarUrl ? (
              <img className="avatar avatar--sm" src={creatorAvatarUrl} alt={`Avatar de ${creator.username}`} />
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
          {attachments.length > 0 ? (
            attachments.map((attachment) => (
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
            {commentActionError ? <p className="form-error comment-action-error">{commentActionError}</p> : null}
            <div className="comment-list">
              {comments.length > 0 ? (
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
              {activities.length > 0 ? (
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
        <section className="issue-detail-sidebar-section">
          <h2 className="issue-detail-sidebar-title">Metadata</h2>
          <div className="issue-detail-meta-list">
            {issue.status ? <StatusPill item={issue.status} /> : null}
            {issue.type ? <StatusPill item={issue.type} /> : null}
            {issue.priority ? <StatusPill item={issue.priority} /> : null}
            {issue.severity ? <StatusPill item={issue.severity} /> : null}
            {(issue.tags ?? []).map((tag) => (
              <StatusPill key={tag.name} item={tag} />
            ))}
          </div>
        </section>

        <section className="issue-detail-sidebar-section">
          <div className="issue-detail-sidebar-header">
            <h2 className="issue-detail-sidebar-title">Assigned</h2>
            <button
              className={`button issue-detail-inline-action${isAssignedToCurrentUser ? " button-danger" : ""}`}
              type="button"
              disabled={issueActionLoading}
              onClick={() =>
                void runIssueAction(
                  () =>
                    isAssignedToCurrentUser
                      ? unassignMe(currentUser.apiKey, issueId)
                      : assignMe(currentUser.apiKey, issueId),
                  isAssignedToCurrentUser
                    ? "No s'ha pogut desassignar la issue."
                    : "No s'ha pogut assignar la issue."
                )
              }
            >
              {isAssignedToCurrentUser ? <UserMinus size={15} aria-hidden="true" /> : <UserCheck size={15} aria-hidden="true" />}
              {isAssignedToCurrentUser ? "Unassign" : "Assign me"}
            </button>
          </div>

          {issue.assignee ? (
            <div className="issue-detail-person-card">
              {renderUserAvatar(issue.assignee)}
              <div className="issue-detail-person-copy">
                <strong>{issue.assignee.full_name ?? issue.assignee.username}</strong>
                <span>@{issue.assignee.username}</span>
              </div>
            </div>
          ) : (
            <p className="muted">No one is assigned yet.</p>
          )}

          {usersState.error ? <p className="form-error">{usersState.error.message}</p> : null}

          <div className="issue-detail-selector">
            <label className="issue-detail-selector-label" htmlFor="detail-assignee-select">
              Choose assignee
            </label>
            <select
              id="detail-assignee-select"
              value={assigneeSelection}
              disabled={issueActionLoading || usersState.loading}
              onChange={(event) => setAssigneeSelection(event.target.value)}
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.username} value={user.username}>
                  {user.full_name ?? user.username} (@{user.username})
                </option>
              ))}
            </select>
            <button
              className="button"
              type="button"
              disabled={issueActionLoading || usersState.loading}
              onClick={() =>
                void runIssueAction(
                  () => applyAssignee(currentUser.apiKey, issueId, assigneeSelection),
                  "No s'ha pogut actualitzar l'assignacio."
                )
              }
            >
              Apply assignee
            </button>
          </div>
        </section>

        <section className="issue-detail-sidebar-section">
          <div className="issue-detail-sidebar-header">
            <h2 className="issue-detail-sidebar-title">Watchers</h2>
            <button
              className={`button issue-detail-inline-action${isCurrentUserWatching ? " button-danger" : ""}`}
              type="button"
              disabled={issueActionLoading}
              onClick={() =>
                void runIssueAction(
                  () =>
                    isCurrentUserWatching
                      ? unwatchIssue(currentUser.apiKey, issueId)
                      : watchIssue(currentUser.apiKey, issueId),
                  isCurrentUserWatching
                    ? "No s'ha pogut deixar de seguir la issue."
                    : "No s'ha pogut seguir la issue."
                )
              }
            >
              <Eye size={15} aria-hidden="true" />
              {isCurrentUserWatching ? "Unwatch" : "Watch me"}
            </button>
          </div>

          {(issue.watchers ?? []).length > 0 ? (
            <div className="issue-detail-people-list">
              {issue.watchers.map((watcher) => (
                <div className="issue-detail-person-card" key={watcher.username}>
                  {renderUserAvatar(watcher)}
                  <div className="issue-detail-person-copy">
                    <strong>{watcher.full_name ?? watcher.username}</strong>
                    <span>@{watcher.username}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No watchers yet.</p>
          )}

          {usersState.error ? <p className="form-error">{usersState.error.message}</p> : null}

          <div className="issue-detail-selector">
            <span className="issue-detail-selector-label">Replace watchers</span>
            <div className="issue-detail-watchers-options">
              {users.map((user) => {
                const isSelected = watcherSelection.some(
                  (username) => normalizeIdentity(username) === normalizeIdentity(user.username)
                );

                return (
                  <label className="issue-detail-watcher-option" key={user.username}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={issueActionLoading || usersState.loading}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setWatcherSelection((current) =>
                            current.some(
                              (username) => normalizeIdentity(username) === normalizeIdentity(user.username)
                            )
                              ? current
                              : [...current, user.username]
                          );
                          return;
                        }

                        setWatcherSelection((current) =>
                          current.filter(
                            (username) => normalizeIdentity(username) !== normalizeIdentity(user.username)
                          )
                        );
                      }}
                    />
                    {renderUserAvatar(user)}
                    <span className="issue-detail-person-copy">
                      <strong>{user.full_name ?? user.username}</strong>
                      <span>@{user.username}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <button
              className="button"
              type="button"
              disabled={issueActionLoading || usersState.loading}
              onClick={() =>
                void runIssueAction(
                  () => applyWatchers(currentUser.apiKey, issueId, watcherSelection),
                  "No s'han pogut actualitzar els watchers."
                )
              }
            >
              Apply watchers
            </button>
          </div>
        </section>

        {issueActionError ? <p className="form-error">{issueActionError}</p> : null}
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

          <aside className="right-panel issue-detail-sidebar">{lateralBox()}</aside>
        </div>
      </div>
    </div>
  );
}
