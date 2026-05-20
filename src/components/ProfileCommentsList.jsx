import { MessageSquareText } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { deleteIssueComment, updateIssueComment } from "../api/issues";
import { getUserComments } from "../api/users";
import { useCurrentUser } from "../context/currentUser";
import { useAsync } from "../hooks/useAsync";
import { normalizePagedList } from "../utils/apiList";
import { getApiActionErrorMessage } from "../utils/apiError";
import { formatDate } from "../utils/format";
import { EmptyState } from "./EmptyState";
import { LoadingState } from "./LoadingState";

export function ProfileCommentsList({ username }) {
  const { currentUser } = useCurrentUser();
  const isOwnProfile = currentUser?.username === username;
  const commentsState = useAsync(
    () => getUserComments(currentUser?.apiKey, username),
    [currentUser?.apiKey, username]
  );
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingContent, setEditingContent] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const comments = normalizePagedList(commentsState.data);

  function startEditing(comment) {
    setActionError("");
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
  }

  function cancelEditing() {
    setActionError("");
    setEditingCommentId(null);
    setEditingContent("");
  }

  async function saveComment(commentId) {
    const content = editingContent.trim();
    if (!content || actionLoading) return;

    setActionError("");
    setActionLoading(true);

    try {
      await updateIssueComment(currentUser?.apiKey, commentId, content);
      await commentsState.reload({ silent: true });
      cancelEditing();
    } catch (error) {
      setActionError(getApiActionErrorMessage(error, "The comment couldn't be saved."));
    } finally {
      setActionLoading(false);
    }
  }

  async function removeComment(commentId) {
    if (actionLoading) return;

    setActionError("");
    setActionLoading(true);

    try {
      await deleteIssueComment(currentUser?.apiKey, commentId);
      await commentsState.reload({ silent: true });
      if (editingCommentId === commentId) {
        cancelEditing();
      }
    } catch (error) {
      setActionError(getApiActionErrorMessage(error, "The comment couldn't be deleted."));
    } finally {
      setActionLoading(false);
    }
  }

  if (commentsState.loading) {
    return <LoadingState />;
  }

  if (commentsState.error) {
    return (
      <EmptyState
        title="The comments couldn't be loaded"
        description={commentsState.error.message}
      />
    );
  }

  if (comments.length === 0) {
    return (
      <EmptyState
        title="There are no comments yet"
        description="This user has not made any comments yet."
      />
    );
  }

  return (
    <div className="profile-comments-list">
      {actionError ? <p className="form-error">{actionError}</p> : null}
      {comments.map((comment) => (
        <article key={comment.id} className="profile-comment-card">
          <header className="profile-comment-card__header">
            <div className="profile-comment-card__issue">
              <MessageSquareText size={16} aria-hidden="true" />
              <Link className="profile-comment-card__issue-link" to={`/issues/${comment.issue.id}#comments`}>
                <span className="profile-comment-card__issue-id">#{comment.issue.id}</span>
                <span className="profile-comment-card__issue-title">{comment.issue.title}</span>
              </Link>
            </div>
            <time className="profile-comment-card__date" dateTime={comment.created_at}>
              {formatDate(comment.created_at)}
            </time>
          </header>
          {isOwnProfile && editingCommentId === comment.id ? (
            <div className="comment-item__edit">
              <textarea
                value={editingContent}
                onChange={(event) => setEditingContent(event.target.value)}
                aria-label="Edit comment"
              />
              <div className="comment-item__edit-actions">
                <button
                  className="button button-primary"
                  type="button"
                  disabled={actionLoading || !editingContent.trim()}
                  onClick={() => saveComment(comment.id)}
                >
                  Save
                </button>
                <button
                  className="button"
                  type="button"
                  disabled={actionLoading}
                  onClick={cancelEditing}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="profile-comment-card__content">{comment.content}</p>
              {isOwnProfile ? (
                <div className="comment-item__actions profile-comment-card__actions">
                  <button
                    className="button comment-item__action"
                    type="button"
                    disabled={actionLoading}
                    onClick={() => startEditing(comment)}
                  >
                    Edit
                  </button>
                  <button
                    className="button comment-item__action comment-item__action--danger"
                    type="button"
                    disabled={actionLoading}
                    onClick={() => removeComment(comment.id)}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </>
          )}
        </article>
      ))}
    </div>
  );
}
