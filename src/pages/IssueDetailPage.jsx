import { ArrowLeft, Clock3 } from "lucide-react";
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
  commentActionError,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRemove,
}) {
  const author = comment.created_by;
  const authorDate = comment.updated_at ?? comment.created_at;

  return (
    <article className="comment-item">
      <header className="comment-header">
        <div className="comment-author">
          {author?.username ? (
            <>
              <Link
                className="comment-author-avatar-link"
                to={`/profile/${author.username}`}
                title={`View ${author.username}'s profile`}
              >
                <UserAvatar user={author} variant="commentAuthor" />
              </Link>
              <div className="comment-author-copy">
                <Link className="comment-author-link" to={`/profile/${author.username}`}>
                  {author.username}
                </Link>
                <time className="comment-author-date" dateTime={authorDate}>
                  {formatSidebarDateTime(authorDate)}
                </time>
              </div>
            </>
          ) : (
            <>
              <span className="comment-author-avatar comment-author-avatar--initials">?</span>
              <div className="comment-author-copy">
                <strong>Anonymous</strong>
                <time className="comment-author-date" dateTime={authorDate}>
                  {formatSidebarDateTime(authorDate)}
                </time>
              </div>
            </>
          )}
        </div>
      </header>

      {isEditing ? (
        <form
          className="comment-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSaveEdit();
          }}
        >
          <textarea
            value={editingContent}
            onChange={(event) => onEditingContentChange(event.target.value)}
            aria-label="Edit comment"
          />
          {commentActionError ? <div className="comment-error">{commentActionError}</div> : null}
          <div className="comment-actions">
            <button className="btn btn-primary" type="submit" disabled={actionLoading}>
              Save
            </button>
            <button className="btn btn-secondary" type="button" disabled={actionLoading} onClick={onCancelEdit}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="comment-content">{comment.content}</p>
          {isOwner ? (
            <div className="comment-actions">
              <button className="btn btn-edit" type="button" disabled={actionLoading} onClick={onStartEdit}>
                Edit
              </button>
              <button className="btn btn-delete" type="button" disabled={actionLoading} onClick={onRemove}>
                Delete
              </button>
            </div>
          ) : null}
        </>
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

function UserPickerOption({ user, inputType, name, checked, disabled = false, onChange }) {
  return (
    <label className="watchers-item">
      <input
        type={inputType}
        name={inputType === "radio" ? name : undefined}
        value={inputType === "radio" ? user.username : undefined}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <UserPickerLabel user={user} />
    </label>
  );
}

function ActivityItem({ activity }) {
  const author = getActivityActor(activity);
  const authorName = author ? author.full_name ?? author.username : "System";
  const activityType = activity.get_activity_type_display ?? activity.activity_type ?? "Activity";

  return (
    <article className="comment-item">
      <header className="comment-header">
        <div className="comment-author">
          {author?.username ? (
            <>
              <Link
                className="comment-author-avatar-link"
                to={`/profile/${author.username}`}
                title={`View ${author.username}'s profile`}
              >
                <UserAvatar user={author} variant="commentAuthor" />
              </Link>
              <div className="comment-author-copy">
                <Link className="comment-author-link" to={`/profile/${author.username}`}>
                  {author.username}
                </Link>
                <time className="comment-author-date" dateTime={activity.created_at}>
                  {formatSidebarDateTime(activity.created_at)}
                </time>
              </div>
            </>
          ) : (
            <>
              <span className="comment-author-avatar comment-author-avatar--initials">S</span>
              <div className="comment-author-copy">
                <strong>{authorName}</strong>
                <time className="comment-author-date" dateTime={activity.created_at}>
                  {formatSidebarDateTime(activity.created_at)}
                </time>
              </div>
            </>
          )}
        </div>
        <div className="attachment-sub">{activityType}</div>
      </header>
      <p className="comment-content">{activity.summary}</p>
    </article>
  );
}

function IssueDetailWorkspace({ headerSubtitle, children }) {
  return (
    <IssueWorkspaceShell pageClassName="issue-workspace issue-detail-page">
      <header className="topbar issue-detail-topbar">
        <AppBrand className="issue-workspace-brand" subtitle={headerSubtitle} />
        <div className="topbar-actions">
          <Link className="btn btn-secondary" to="/issues">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to Issues
          </Link>
        </div>
      </header>
      <main className="create-layout issue-shell">{children}</main>
    </IssueWorkspaceShell>
  );
}

function IssueCreatorCard({ creator, createdAt }) {
  if (!creator?.username) {
    return (
      <div className="issue-creator-card">
        <span className="issue-user-avatar issue-user-avatar--initials">?</span>
        <div className="issue-creator-copy">
          <span className="issue-creator-label">Created by Unknown</span>
          <span className="issue-creator-date">{formatSidebarDateTime(createdAt)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="issue-creator-card">
      <Link
        className="issue-creator-avatar-link"
        to={`/profile/${creator.username}`}
        title={`View ${creator.username}'s profile`}
      >
        <UserAvatar user={creator} variant="creator" />
      </Link>
      <div className="issue-creator-copy">
        <span className="issue-creator-label">
          Created by{" "}
          <Link className="issue-creator-link" to={`/profile/${creator.username}`}>
            {creator.username}
          </Link>
        </span>
        <span className="issue-creator-date">{formatSidebarDateTime(createdAt)}</span>
      </div>
    </div>
  );
}

function IssueDeadlineIcon({ deadline, color }) {
  if (!deadline) return null;

  return (
    <Clock3
      className="issue-title-icon"
      size={20}
      color={color || "#94a3b8"}
      aria-label={`Deadline: ${formatDate(deadline)}`}
    />
  );
}

function AttachmentItem({ attachment, canDelete, isDeleting, onRemove }) {
  return (
    <article className="comment-item">
      <div className="comment-header">
        {attachment.file_url ? (
          <a
            className="attachment-name"
            href={attachment.file_url}
            target="_blank"
            rel="noopener noreferrer"
            title="View or download file"
          >
            {attachment.file_name}
          </a>
        ) : (
          <span className="attachment-name">{attachment.file_name}</span>
        )}
      </div>
      <div className="attachment-sub">
        Uploaded {formatSidebarDateTime(attachment.uploaded_at)}
        {attachment.uploaded_by?.username ? ` by ${attachment.uploaded_by.username}` : ""}
      </div>
      {canDelete ? (
        <div className="comment-actions">
          <button className="btn btn-delete" type="button" disabled={isDeleting} onClick={onRemove}>
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      ) : null}
    </article>
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
      setCommentActionError("The comment cannot be empty.");
      return;
    }

    setCommentActionLoading(true);
    setCommentActionError("");
    try {
      await updateIssueComment(apiKey, commentId, content);
      cancelEditingComment();
      await reloadDiscussion();
    } catch (error) {
      setCommentActionError(getApiActionErrorMessage(error, "The comment couldn't be saved."));
    } finally {
      setCommentActionLoading(false);
    }
  }

  async function removeComment(commentId) {
    if (!window.confirm("Do you want to delete this comment?")) return;

    setCommentActionLoading(true);
    setCommentActionError("");
    try {
      await deleteIssueComment(apiKey, commentId);
      if (String(editingCommentId) === String(commentId)) cancelEditingComment();
      await reloadDiscussion();
    } catch (error) {
      setCommentActionError(getApiActionErrorMessage(error, "The comment couldn't be deleted."));
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
      setAttachmentUploadError(getApiActionErrorMessage(error, "The file couldn't be uploaded."));
    } finally {
      setAttachmentUploadLoading(false);
    }
  }

  async function removeAttachment(attachmentId) {
    if (!window.confirm("Do you want to delete this attachment?")) return;

    setAttachmentUploadError("");
    setDeletingAttachmentId(attachmentId);
    try {
      await deleteIssueAttachment(apiKey, attachmentId);
      await Promise.all([attachmentsState.reload(), activitiesState.reload()]);
    } catch (error) {
      setAttachmentUploadError(getApiActionErrorMessage(error, "The attachment couldn't be deleted."));
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
      "The assignment couldn't be updated."
    );
  }

  async function toggleWatch() {
    const isWatching = (issue?.watchers ?? []).some((watcher) => watcher.username === currentUsername);
    await runLateralAction(
      () => (isWatching ? unwatchIssue(apiKey, issueId) : watchIssue(apiKey, issueId)),
      "The watchers couldn't be updated."
    );
  }

  async function applyAssignees() {
    await runLateralAction(
      () => applyIssueAssignees(apiKey, issueId, draftAssigneeUsername),
      "The assignee couldn't be applied."
    );
  }

  async function applyWatchers() {
    await runLateralAction(
      () => applyIssueWatchers(apiKey, issueId, draftWatcherUsernames),
      "The watchers couldn't be applied."
    );
  }

  async function handleAssigneeSelection(username) {
    setDraftAssigneeUsername(username);
    await runLateralAction(
      () => applyIssueAssignees(apiKey, issueId, username),
      "The assignee couldn't be applied."
    );
  }

  async function handleWatcherToggle(username) {
    const nextUsernames = draftWatcherUsernames.includes(username)
      ? draftWatcherUsernames.filter((item) => item !== username)
      : [...draftWatcherUsernames, username];

    setDraftWatcherUsernames(nextUsernames);
    await runLateralAction(
      () => applyIssueWatchers(apiKey, issueId, nextUsernames),
      "The watchers couldn't be applied."
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
    if (!window.confirm("Are you sure you want to delete this issue?")) return;

    setIssueDeleteError("");
    setIssueDeleteLoading(true);
    try {
      await deleteIssue(apiKey, issueId);
      navigate("/issues");
    } catch (error) {
      setIssueDeleteError(getApiActionErrorMessage(error, "The issue couldn't be deleted."));
    } finally {
      setIssueDeleteLoading(false);
    }
  }

  if (issueState.loading && !issue) {
    return (
      <IssueDetailWorkspace headerSubtitle="Loading issue...">
        <section className="panel">
          <LoadingState />
        </section>
      </IssueDetailWorkspace>
    );
  }

  if (issueState.error || !issue) {
    return (
      <IssueDetailWorkspace headerSubtitle="Issue no disponible">
        <section className="panel">
          <EmptyState
            title="The issue couldn't be loaded"
            description={issueState.error?.message ?? "Issue no trobada."}
          />
        </section>
      </IssueDetailWorkspace>
    );
  }

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
    <IssueDetailWorkspace headerSubtitle="Issue details">
      <div className="issue-view-grid">
        <div className="issue-content-stack">
          <section className="panel issue-hero-panel">
            <div className="issue-hero-top">
              <div className="issue-heading-wrap">
                <div className="issue-title-row">
                  <span className="issue-title-number">#{issue.id}</span>
                  <h2 className="issue-title-text">{issue.title}</h2>
                  <IssueDeadlineIcon deadline={issue.deadline} color={issue.deadline_color} />
                </div>

                {issue.tags?.length ? (
                  <div className="tag-row issue-tag-row">
                    {issue.tags.map((tag) => (
                      <span key={tag.name} className="tag-pill" style={{ background: tag.color }}>
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <IssueCreatorCard creator={creator} createdAt={createdAt} />
            </div>

            <div className="issue-text-block">
              <h3 className="issue-section-heading">Description</h3>
              <div
                className={`issue-description-body${issue.description ? "" : " issue-description-body--empty"}`}
              >
                {issue.description || "Empty space is so boring... go on, be descriptive..."}
              </div>
            </div>
          </section>

          <section className="panel issue-section-panel">
            <div className="detail-box-header">
              <h2>Attachments</h2>
            </div>

            <div className="upload-inline">
              <input
                ref={attachmentFileInputRef}
                type="file"
                accept={ATTACHMENT_ACCEPT}
                aria-label="Select file to upload"
                onChange={(event) => void handleAttachmentFileChange(event)}
              />
            </div>
            <div className="attachment-sub">
              {ATTACHMENT_HELP_FORMATS} {ATTACHMENT_HELP_MAX_SIZE}
            </div>

            {attachmentUploadError ? <div className="comment-error">{attachmentUploadError}</div> : null}

            {attachmentsState.loading ? (
              <p className="comment-empty">Loading attachments...</p>
            ) : attachmentsState.error ? (
              <p className="comment-error">{attachmentsState.error.message}</p>
            ) : attachmentItems.length > 0 ? (
              <div className="comments-list comments-list-top">
                {attachmentItems.map((attachment) => {
                  const canDelete = isAttachmentOwner(attachment, currentUsername);
                  const isDeleting = String(deletingAttachmentId) === String(attachment.id);

                  return (
                    <AttachmentItem
                      key={attachment.id}
                      attachment={attachment}
                      canDelete={canDelete}
                      isDeleting={isDeleting}
                      onRemove={() => void removeAttachment(attachment.id)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="attachment-empty attachment-empty-top">
                No attachments yet. Use + to upload the first file.
              </div>
            )}
          </section>

          <section className="panel issue-section-panel">
            <div className="detail-box-header">
              <h2>Discussion</h2>
            </div>

            <div className="detail-tabs" role="tablist" aria-label="Discussion sections">
              <button
                className={`detail-tab${discussionView === "comments" ? " active" : ""}`}
                type="button"
                role="tab"
                aria-selected={discussionView === "comments"}
                onClick={() => setDiscussionView("comments")}
              >
                Comments
              </button>
              <button
                className={`detail-tab${discussionView === "activities" ? " active" : ""}`}
                type="button"
                role="tab"
                aria-selected={discussionView === "activities"}
                onClick={() => setDiscussionView("activities")}
              >
                Activities
              </button>
            </div>

            <div className="discussion-body">
              {discussionView === "comments" ? (
                <>
                  <div className="detail-box-header detail-box-header--tight">
                    <h2>Add a comment</h2>
                  </div>

                  <form className="comment-form" onSubmit={submitComment}>
                    <textarea
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="Type a new comment here"
                    />
                    {commentActionError && !editingCommentId ? (
                      <div className="comment-error">{commentActionError}</div>
                    ) : null}
                    <div className="form-actions comment-submit-actions">
                      <button className="btn btn-primary" type="submit">
                        Add comment
                      </button>
                    </div>
                  </form>

                  {commentsState.loading ? (
                    <p className="comment-empty">Loading comments...</p>
                  ) : commentsState.error ? (
                    <p className="comment-error">{commentsState.error.message}</p>
                  ) : commentList.length > 0 ? (
                    <div className="comments-list comments-list-top">
                      {commentList.map((item) => (
                        <CommentItem
                          key={item.id}
                          comment={item}
                          isOwner={isCommentOwner(item)}
                          isEditing={String(editingCommentId) === String(item.id)}
                          editingContent={editingCommentContent}
                          onEditingContentChange={setEditingCommentContent}
                          actionLoading={commentActionLoading}
                          commentActionError={
                            String(editingCommentId) === String(item.id) ? commentActionError : ""
                          }
                          onStartEdit={() => startEditingComment(item)}
                          onCancelEdit={cancelEditingComment}
                          onSaveEdit={() => void saveEditedComment(item.id)}
                          onRemove={() => void removeComment(item.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="comment-empty">No comments yet.</p>
                  )}
                </>
              ) : activitiesState.loading ? (
                <p className="comment-empty">Loading activities...</p>
              ) : activitiesState.error ? (
                <p className="comment-error">{activitiesState.error.message}</p>
              ) : activities.length > 0 ? (
                <div className="comments-list comments-list-top">
                  {activities.map((item) => (
                    <ActivityItem key={item.id} activity={item} />
                  ))}
                </div>
              ) : (
                <p className="comment-empty">No activity yet.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="panel issue-sidebar-panel" aria-label="Issue metadata">
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
                value={formatDate(issue.deadline)}
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
                className={`btn btn-sm issue-people-action${isAssignedToMe ? " btn-delete" : " btn-edit"}`}
                type="button"
                disabled={lateralLoading}
                onClick={() => void toggleAssignToMe()}
              >
                {isAssignedToMe ? "Unassign" : "Assign to me"}
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
                    disabled={lateralLoading || usersState.loading}
                    onChange={() => void handleAssigneeSelection("")}
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
                    disabled={lateralLoading || usersState.loading}
                    onChange={() => void handleAssigneeSelection(user.username)}
                  />
                ))}
              </div>
            </details>
          </section>

          <section className="issue-sidebar-section">
            <div className="issue-people-header">
              <h3 className="issue-sidebar-title">Watchers</h3>
              <button
                className={`btn btn-sm issue-people-action${isWatching ? " btn-delete" : " btn-edit"}`}
                type="button"
                disabled={lateralLoading}
                onClick={() => void toggleWatch()}
              >
                {isWatching ? "Unwatch" : "Watch"}
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
                      disabled={lateralLoading || usersState.loading}
                      onChange={() => void handleWatcherToggle(user.username)}
                    />
                  ))
                ) : (
                  <span className="assign-hint">No users available</span>
                )}
              </div>
            </details>
          </section>

          {lateralError ? <p className="comment-error issue-sidebar-error">{lateralError}</p> : null}

          {isIssueCreator ? (
            <section className="issue-sidebar-section">
              <div className="issue-owner-actions">
                <button className="btn btn-edit" type="button" onClick={() => navigate(`/issues/${issueId}/edit`)}>
                  Edit issue
                </button>
                <button
                  className="btn btn-delete"
                  type="button"
                  disabled={issueDeleteLoading}
                  onClick={() => void deleteIssueAndLeave()}
                >
                  {issueDeleteLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
              {issueDeleteError ? <p className="comment-error">{issueDeleteError}</p> : null}
            </section>
          ) : null}
        </aside>
      </div>
    </IssueDetailWorkspace>
  );
}
