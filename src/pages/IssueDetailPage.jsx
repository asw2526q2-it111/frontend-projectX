import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  applyIssueAssignees,
  applyIssueWatchers,
  assignMe,
  createIssueComment,
  deleteIssue,
  deleteIssueAttachment,
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
import { listUsers } from "../api/users";
import { AppBrand } from "../components/AppBrand";
import { EmptyState } from "../components/EmptyState";
import { IssueMetaRow } from "../components/IssueMetaRow";
import { IssueWorkspaceShell } from "../components/IssueWorkspaceShell";
import { LoadingState } from "../components/LoadingState";
import { UserAvatar } from "../components/UserAvatar";
import { UserProfileLink } from "../components/UserProfileLink";
import { useCurrentUser } from "../context/currentUser";
import { useAsync } from "../hooks/useAsync";
import { getActivityActor } from "../utils/activities";
import { getApiActionErrorMessage } from "../utils/apiError";
import { normalizePagedList } from "../utils/apiList";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_HELP_FORMATS,
  ATTACHMENT_HELP_MAX_SIZE,
  createIssueAttachmentAndReload,
  isAttachmentOwner,
  normalizeAttachmentList,
  prepareIssueAttachmentUpload,
} from "../utils/attachments";
import { formatDate, formatSidebarDateTime } from "../utils/format";
import { getUserDisplayName } from "../utils/user";

function CommentItem({
  comment,
  isOwner,
  isEditing,
  editingContent,
  onEditingContentChange,
  actionLoading,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRemove,
}) {
  const author = comment.created_by;

  return (
    <article className="comment-item">
      <header className="comment-item__header">
        <UserProfileLink user={author} layout="author" />
        <div className="comment-item__meta">
          <time className="comment-item__date" dateTime={comment.created_at}>
            {formatDate(comment.created_at)}
          </time>
          {isOwner && !isEditing ? (
            <div className="comment-item__actions">
              <button
                className="button comment-item__action"
                type="button"
                disabled={actionLoading}
                onClick={onStartEdit}
              >
                Editar
              </button>
              <button
                className="button comment-item__action comment-item__action--danger"
                type="button"
                disabled={actionLoading}
                onClick={onRemove}
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
            value={editingContent}
            onChange={(event) => onEditingContentChange(event.target.value)}
            aria-label="Editar comentari"
          />
          <div className="comment-item__edit-actions">
            <button
              className="button button-primary"
              type="button"
              disabled={actionLoading}
              onClick={onSaveEdit}
            >
              Guardar
            </button>
            <button
              className="button"
              type="button"
              disabled={actionLoading}
              onClick={onCancelEdit}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <p className="comment-item__content">{comment.content}</p>
      )}
    </article>
  );
}

function UserPickerLabel({ user }) {
  return (
    <span className="watchers-item__label">
      <strong>{getUserDisplayName(user)}</strong>
      <small>@{user.username}</small>
    </span>
  );
}

function UserPickerOption({ user, inputType, name, checked, onChange }) {
  return (
    <label className="watchers-item">
      <input
        type={inputType}
        name={inputType === "radio" ? name : undefined}
        value={inputType === "radio" ? user.username : undefined}
        checked={checked}
        onChange={onChange}
      />
      <UserPickerLabel user={user} />
    </label>
  );
}

function ActivityItem({ activity }) {
  const author = getActivityActor(activity);
  const authorName = author ? author.full_name ?? author.username : "Sistema";

  return (
    <article className="comment-item">
      <header className="comment-item__header">
        {author ? (
          <UserProfileLink user={author} layout="author" />
        ) : (
          <div className="comment-item__author">
            <strong>{authorName}</strong>
          </div>
        )}
        <div className="comment-item__meta">
          <time className="comment-item__date" dateTime={activity.created_at}>
            {formatDate(activity.created_at)}
          </time>
        </div>
      </header>
      <p className="comment-item__content">{activity.summary}</p>
    </article>
  );
}

function IssueDetailWorkspace({ headerSubtitle, headerUser, children }) {
  const { currentUser } = useCurrentUser();
  const topbarUser =
    headerUser ?? {
      username: currentUser.username,
      full_name: currentUser.fullName,
    };

  return (
    <IssueWorkspaceShell pageClassName="issue-workspace issue-detail-page">
      <header className="topbar custom-topbar issue-topbar issue-detail-topbar">
        <AppBrand className="issue-workspace-brand" subtitle={headerSubtitle} />
        <div className="issue-detail-topbar-actions">
          <Link className="button issue-list-secondary-button" to="/issues">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to Issues
          </Link>
          <Link className="button issue-profile-button" to={`/profile/${currentUser.username}`}>
            <UserAvatar user={topbarUser} variant="topbar" />
            {currentUser.username}
          </Link>
        </div>
      </header>
      <main className="layout issue-workspace-layout issue-detail-layout">{children}</main>
    </IssueWorkspaceShell>
  );
}

export function IssueDetailPage() {
  const { issueId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();
  const currentUsername = currentUser.username;
  const apiKey = currentUser.apiKey;

  const issueState = useAsync(() => getIssue(apiKey, issueId), [apiKey, issueId]);
  const attachmentsState = useAsync(() => getIssueAttachments(apiKey, issueId), [apiKey, issueId]);
  const commentsState = useAsync(() => getIssueComments(apiKey, issueId), [apiKey, issueId]);
  const activitiesState = useAsync(() => getIssueActivities(apiKey, issueId), [apiKey, issueId]);
  const usersState = useAsync(() => listUsers(apiKey), [apiKey]);

  const attachmentItems = normalizeAttachmentList(attachmentsState.data);
  const commentList = normalizePagedList(commentsState.data);
  const activities = normalizePagedList(activitiesState.data);
  const users = normalizePagedList(usersState.data);

  const [discussionView, setDiscussionView] = useState("comments");
  const [comment, setComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [commentActionError, setCommentActionError] = useState("");
  const [commentActionLoading, setCommentActionLoading] = useState(false);

  const attachmentFileInputRef = useRef(null);
  const [attachmentUploadError, setAttachmentUploadError] = useState("");
  const [attachmentUploadLoading, setAttachmentUploadLoading] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState(null);

  const [draftAssigneeUsername, setDraftAssigneeUsername] = useState("");
  const [draftWatcherUsernames, setDraftWatcherUsernames] = useState([]);
  const [lateralError, setLateralError] = useState("");
  const [lateralLoading, setLateralLoading] = useState(false);
  const [issueDeleteError, setIssueDeleteError] = useState("");
  const [issueDeleteLoading, setIssueDeleteLoading] = useState(false);

  const issue = issueState.data;

  useEffect(() => {
    if (!issue) return;
    setDraftAssigneeUsername(issue.assignee?.username ?? "");
    setDraftWatcherUsernames((issue.watchers ?? []).map((watcher) => watcher.username));
  }, [issue]);

  async function reloadIssueAndActivities() {
    await Promise.all([issueState.reload({ silent: true }), activitiesState.reload()]);
  }

  async function reloadDiscussion() {
    await Promise.all([commentsState.reload(), activitiesState.reload()]);
  }

  function isCommentOwner(item) {
    return item.created_by?.username === currentUsername;
  }

  function startEditingComment(item) {
    setCommentActionError("");
    setEditingCommentId(item.id);
    setEditingCommentContent(item.content);
  }

  function cancelEditingComment() {
    setCommentActionError("");
    setEditingCommentId(null);
    setEditingCommentContent("");
  }

  async function submitComment(event) {
    event.preventDefault();
    if (!comment.trim()) return;
    await createIssueComment(apiKey, issueId, comment.trim());
    setComment("");
    await reloadDiscussion();
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
      await updateIssueComment(apiKey, commentId, content);
      cancelEditingComment();
      await reloadDiscussion();
    } catch (error) {
      setCommentActionError(getApiActionErrorMessage(error, "No s'ha pogut guardar el comentari."));
    } finally {
      setCommentActionLoading(false);
    }
  }

  async function removeComment(commentId) {
    if (!window.confirm("Vols eliminar aquest comentari?")) return;

    setCommentActionLoading(true);
    setCommentActionError("");
    try {
      await deleteIssueComment(apiKey, commentId);
      if (String(editingCommentId) === String(commentId)) cancelEditingComment();
      await reloadDiscussion();
    } catch (error) {
      setCommentActionError(getApiActionErrorMessage(error, "No s'ha pogut eliminar el comentari."));
    } finally {
      setCommentActionLoading(false);
    }
  }

  async function handleAttachmentFileChange(event) {
    setAttachmentUploadError("");
    const prepared = prepareIssueAttachmentUpload(event);
    if (prepared.kind === "noop") return;
    if (prepared.kind === "invalid") {
      setAttachmentUploadError(prepared.message);
      return;
    }

    setAttachmentUploadLoading(true);
    try {
      await createIssueAttachmentAndReload(prepared.file, {
        apiKey,
        issueId,
        reloadAttachments: attachmentsState.reload,
        reloadActivities: activitiesState.reload,
      });
    } catch (error) {
      setAttachmentUploadError(getApiActionErrorMessage(error, "No s'ha pogut pujar el fitxer."));
    } finally {
      setAttachmentUploadLoading(false);
    }
  }

  async function removeAttachment(attachmentId) {
    if (!window.confirm("Vols eliminar aquest adjunt?")) return;

    setAttachmentUploadError("");
    setDeletingAttachmentId(attachmentId);
    try {
      await deleteIssueAttachment(apiKey, attachmentId);
      await Promise.all([attachmentsState.reload(), activitiesState.reload()]);
    } catch (error) {
      setAttachmentUploadError(getApiActionErrorMessage(error, "No s'ha pogut eliminar l'adjunt."));
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  async function runLateralAction(action, fallbackMessage) {
    setLateralError("");
    setLateralLoading(true);
    try {
      const updatedIssue = await action();
      if (updatedIssue?.id != null) {
        issueState.setData(updatedIssue);
      } else {
        await issueState.reload({ silent: true });
      }
      await activitiesState.reload();
    } catch (error) {
      setLateralError(getApiActionErrorMessage(error, fallbackMessage));
    } finally {
      setLateralLoading(false);
    }
  }

  async function toggleAssignToMe() {
    const isAssigned = issue?.assignee?.username === currentUsername;
    await runLateralAction(
      () => (isAssigned ? unassignMe(apiKey, issueId) : assignMe(apiKey, issueId)),
      "No s'ha pogut actualitzar l'assignacio."
    );
  }

  async function toggleWatch() {
    const isWatching = (issue?.watchers ?? []).some((watcher) => watcher.username === currentUsername);
    await runLateralAction(
      () => (isWatching ? unwatchIssue(apiKey, issueId) : watchIssue(apiKey, issueId)),
      "No s'ha pogut actualitzar els watchers."
    );
  }

  async function applyAssignees() {
    await runLateralAction(
      () => applyIssueAssignees(apiKey, issueId, draftAssigneeUsername),
      "No s'ha pogut aplicar l'assignat."
    );
  }

  async function applyWatchers() {
    await runLateralAction(
      () => applyIssueWatchers(apiKey, issueId, draftWatcherUsernames),
      "No s'ha pogut aplicar els watchers."
    );
  }

  function toggleDraftWatcher(username) {
    setDraftWatcherUsernames((current) =>
      current.includes(username)
        ? current.filter((item) => item !== username)
        : [...current, username]
    );
  }

  async function deleteIssueAndLeave() {
    if (!window.confirm("Segur que vols eliminar aquesta issue?")) return;

    setIssueDeleteError("");
    setIssueDeleteLoading(true);
    try {
      await deleteIssue(apiKey, issueId);
      navigate("/issues");
    } catch (error) {
      setIssueDeleteError(getApiActionErrorMessage(error, "No s'ha pogut eliminar la issue."));
    } finally {
      setIssueDeleteLoading(false);
    }
  }

  if (issueState.loading && !issue) {
    return (
      <IssueDetailWorkspace headerSubtitle="Carregant issue...">
        <section className="content panel issue-detail-content">
          <LoadingState />
        </section>
      </IssueDetailWorkspace>
    );
  }

  if (issueState.error || !issue) {
    return (
      <IssueDetailWorkspace headerSubtitle="Issue no disponible">
        <section className="content panel issue-detail-content">
          <EmptyState
            title="No s'ha pogut carregar la issue"
            description={issueState.error?.message ?? "Issue no trobada."}
          />
        </section>
      </IssueDetailWorkspace>
    );
  }

  const headerUser = users.find((user) => user.username === currentUsername);
  const creator = issue.created_by;
  const createdAt = issue.date_created ?? issue.created_at;
  const statusName = issue.status?.name ?? "Unspecified";
  const statusUpper = statusName.toUpperCase();
  const statusColor = issue.status?.color ?? "#9bd93c";
  const activeWatchers = issue.watchers ?? [];
  const isAssignedToMe = issue.assignee?.username === currentUsername;
  const isWatching = activeWatchers.some((watcher) => watcher.username === currentUsername);
  const isIssueCreator = issue.created_by?.username === currentUsername;

  return (
    <IssueDetailWorkspace headerSubtitle={`Issue #${issue.id}`} headerUser={headerUser}>
      <section className="content panel issue-detail-content">
        <div className="page-stack">
          <section className="panel">
            <header className="content-header issue-detail-header">
              <div>
                <p className="eyebrow">Issue #{issue.id}</p>
                <h2>{issue.title}</h2>
              </div>
              <div className="main-box__creator">
                <UserProfileLink user={creator} layout="creator" />
                <time className="main-box__creator-date" dateTime={createdAt}>
                  {formatDate(createdAt)}
                </time>
              </div>
            </header>
            <p className="issue-detail-description">{issue.description || "Sense descripcio."}</p>
          </section>

          <section className="panel">
            <h2>Attachments</h2>
            <p>
              {ATTACHMENT_HELP_FORMATS} {ATTACHMENT_HELP_MAX_SIZE}
            </p>
            <div className="attachment-list">
              {attachmentsState.loading ? (
                <p className="muted">Carregant adjunts...</p>
              ) : attachmentsState.error ? (
                <p className="form-error">{attachmentsState.error.message}</p>
              ) : attachmentItems.length > 0 ? (
                attachmentItems.map((attachment) => {
                  const canDelete = isAttachmentOwner(attachment, currentUsername);
                  const isDeleting = String(deletingAttachmentId) === String(attachment.id);

                  return (
                    <article className="attachment-item" key={attachment.id}>
                      <div className="attachment-item__body">
                        {attachment.file_url ? (
                          <a
                            className="attachment-item__link"
                            href={attachment.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Obrir o descarregar el fitxer"
                          >
                            {attachment.file_name}
                          </a>
                        ) : (
                          <span className="attachment-item__name">{attachment.file_name}</span>
                        )}
                        {attachment.uploaded_at ? (
                          <p className="attachment-item__meta">
                            <time dateTime={attachment.uploaded_at}>{formatDate(attachment.uploaded_at)}</time>
                            {attachment.uploaded_by?.username ? (
                              <>
                                {" · "}
                                <UserProfileLink user={attachment.uploaded_by} layout="mention" />
                              </>
                            ) : null}
                          </p>
                        ) : null}
                      </div>
                      {canDelete ? (
                        <button
                          className="button attachment-item__delete"
                          type="button"
                          disabled={deletingAttachmentId !== null}
                          onClick={() => void removeAttachment(attachment.id)}
                        >
                          {isDeleting ? "Eliminant..." : "Eliminar"}
                        </button>
                      ) : null}
                    </article>
                  );
                })
              ) : (
                <p className="muted">No hi ha fitxers adjunts.</p>
              )}
            </div>
            <input
              ref={attachmentFileInputRef}
              type="file"
              className="issue-detail-attachment-file-input"
              accept={ATTACHMENT_ACCEPT}
              aria-label="Seleccionar fitxer per pujar"
              onChange={(event) => void handleAttachmentFileChange(event)}
            />
            {attachmentUploadError ? (
              <p className="form-error issue-detail-attachment-upload-error">{attachmentUploadError}</p>
            ) : null}
            <button
              className="button button-primary"
              type="button"
              disabled={attachmentUploadLoading}
              onClick={() => attachmentFileInputRef.current?.click()}
            >
              {attachmentUploadLoading ? "Pujant..." : "Upload"}
            </button>
          </section>

          <section className="panel">
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
                  {commentsState.loading ? (
                    <p className="muted">Carregant comentaris...</p>
                  ) : commentsState.error ? (
                    <p className="form-error">{commentsState.error.message}</p>
                  ) : commentList.length > 0 ? (
                    commentList.map((item) => (
                      <CommentItem
                        key={item.id}
                        comment={item}
                        isOwner={isCommentOwner(item)}
                        isEditing={String(editingCommentId) === String(item.id)}
                        editingContent={editingCommentContent}
                        onEditingContentChange={setEditingCommentContent}
                        actionLoading={commentActionLoading}
                        onStartEdit={() => startEditingComment(item)}
                        onCancelEdit={cancelEditingComment}
                        onSaveEdit={() => void saveEditedComment(item.id)}
                        onRemove={() => void removeComment(item.id)}
                      />
                    ))
                  ) : (
                    <p className="muted">Encara no hi ha comentaris.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="discussion-panel" role="tabpanel">
                <div className="comment-list">
                  {activitiesState.loading ? (
                    <p className="muted">Carregant activitats...</p>
                  ) : activitiesState.error ? (
                    <p className="form-error">{activitiesState.error.message}</p>
                  ) : activities.length > 0 ? (
                    activities.map((item) => <ActivityItem key={item.id} activity={item} />)
                  ) : (
                    <p className="muted">Encara no hi ha activitat.</p>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </section>

      <aside className="right-panel">
        <section className="panel issue-sidebar-panel" aria-label="Issue metadata">
          <section className="issue-sidebar-status">
            <p className="issue-sidebar-kicker">Status</p>
            <div className="issue-sidebar-status-row">
              <div className="issue-sidebar-status-value">{statusUpper}</div>
              <span className="issue-status-chip" style={{ background: statusColor }}>
                {statusName}
              </span>
            </div>
          </section>

          <section className="issue-sidebar-section">
            <div className="issue-meta-list">
              <IssueMetaRow label="Type" value={issue.type?.name} color={issue.type?.color} />
              <IssueMetaRow label="Severity" value={issue.severity?.name} color={issue.severity?.color} />
              <IssueMetaRow label="Priority" value={issue.priority?.name} color={issue.priority?.color} />
              <IssueMetaRow
                label="Deadline"
                value={formatSidebarDateTime(issue.deadline)}
                color={issue.deadline_color}
                soft={!issue.deadline}
              />
              <IssueMetaRow label="Updated" value={formatSidebarDateTime(issue.updated_at)} />
            </div>
          </section>

          <section className="issue-sidebar-section">
            <div className="issue-people-header">
              <h3 className="issue-sidebar-title">Assigned</h3>
              <button
                className={`button issue-people-action${isAssignedToMe ? " button-danger" : " button-primary"}`}
                type="button"
                disabled={lateralLoading}
                onClick={() => void toggleAssignToMe()}
              >
                {isAssignedToMe ? "Unassign" : "Assign me"}
              </button>
            </div>

            {issue.assignee ? (
              <div className="issue-person-list">
                <UserProfileLink user={issue.assignee} />
              </div>
            ) : (
              <p className="issue-person-empty">No one is assigned yet.</p>
            )}

            <details className="watchers-dropdown" open={Boolean(draftAssigneeUsername)}>
              <summary>Select assignee</summary>
              <div className="watchers-list">
                <label className="watchers-item">
                  <input
                    type="radio"
                    name="assignee"
                    value=""
                    checked={!draftAssigneeUsername}
                    onChange={() => setDraftAssigneeUsername("")}
                  />
                  <span>Unassigned</span>
                </label>
                {users.map((user) => (
                  <UserPickerOption
                    key={user.id ?? user.username}
                    user={user}
                    inputType="radio"
                    name="assignee"
                    checked={draftAssigneeUsername === user.username}
                    onChange={() => setDraftAssigneeUsername(user.username)}
                  />
                ))}
              </div>
            </details>
            <div className="issue-people-apply-row">
              <button
                className="button issue-list-secondary-button"
                type="button"
                disabled={lateralLoading || usersState.loading}
                onClick={() => void applyAssignees()}
              >
                Apply
              </button>
            </div>
          </section>

          <section className="issue-sidebar-section">
            <div className="issue-people-header">
              <h3 className="issue-sidebar-title">Watchers</h3>
              <button
                className={`button issue-people-action${isWatching ? " button-danger" : " button-primary"}`}
                type="button"
                disabled={lateralLoading}
                onClick={() => void toggleWatch()}
              >
                {isWatching ? "Unwatch" : "Watch me"}
              </button>
            </div>

            {activeWatchers.length > 0 ? (
              <div className="issue-person-list">
                {activeWatchers.map((watcher) => (
                  <div key={watcher.username}>
                    <UserProfileLink user={watcher} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="issue-person-empty">No watchers yet.</p>
            )}

            <details className="watchers-dropdown" open={draftWatcherUsernames.length > 0}>
              <summary>
                Select watchers
                {draftWatcherUsernames.length ? ` (${draftWatcherUsernames.length})` : ""}
              </summary>
              <div className="watchers-list">
                {users.length > 0 ? (
                  users.map((user) => (
                    <UserPickerOption
                      key={user.id ?? user.username}
                      user={user}
                      inputType="checkbox"
                      checked={draftWatcherUsernames.includes(user.username)}
                      onChange={() => toggleDraftWatcher(user.username)}
                    />
                  ))
                ) : (
                  <span className="assign-hint">No users available</span>
                )}
              </div>
            </details>
            <div className="issue-people-apply-row">
              <button
                className="button issue-list-secondary-button"
                type="button"
                disabled={lateralLoading || usersState.loading}
                onClick={() => void applyWatchers()}
              >
                Apply
              </button>
            </div>
          </section>

          {lateralError ? <p className="form-error issue-sidebar-error">{lateralError}</p> : null}

          {isIssueCreator ? (
            <section className="issue-sidebar-section">
              <div className="issue-owner-actions">
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => navigate(`/issues/${issueId}/edit`)}
                >
                  Edit issue
                </button>
                <button
                  className="button button-danger"
                  type="button"
                  disabled={issueDeleteLoading}
                  onClick={() => void deleteIssueAndLeave()}
                >
                  {issueDeleteLoading ? "Eliminant..." : "Delete"}
                </button>
              </div>
              {issueDeleteError ? <p className="form-error">{issueDeleteError}</p> : null}
            </section>
          ) : null}
        </section>
      </aside>
    </IssueDetailWorkspace>
  );
}
