import { apiRequest } from "./client";

export function listIssues(apiKey, filters = {}) {
  return apiRequest("/api/issues/", {
    apiKey,
    query: filters,
  });
}

export function getIssue(apiKey, issueId) {
  return apiRequest(`/api/issues/${issueId}/`, { apiKey });
}

export function createIssue(apiKey, payload) {
  return apiRequest("/api/issues/", {
    apiKey,
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function bulkCreateIssues(apiKey, payload) {
  return apiRequest("/api/issues/bulk/", {
    apiKey,
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateIssue(apiKey, issueId, payload) {
  return apiRequest(`/api/issues/${issueId}/`, {
    apiKey,
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteIssue(apiKey, issueId) {
  return apiRequest(`/api/issues/${issueId}/`, {
    apiKey,
    method: "DELETE",
  });
}

export function assignMe(apiKey, issueId) {
  return apiRequest(`/api/issues/${issueId}/assign-me/`, {
    apiKey,
    method: "POST",
  });
}

export function unassignMe(apiKey, issueId) {
  return apiRequest(`/api/issues/${issueId}/unassign-me/`, {
    apiKey,
    method: "DELETE",
  });
}

export function watchIssue(apiKey, issueId) {
  return apiRequest(`/api/issues/${issueId}/watch/`, {
    apiKey,
    method: "POST",
  });
}

export function unwatchIssue(apiKey, issueId) {
  return apiRequest(`/api/issues/${issueId}/unwatch/`, {
    apiKey,
    method: "DELETE",
  });
}

export function applyIssueAssignees(apiKey, issueId, assigneeUsername) {
  return apiRequest(`/api/issues/${issueId}/assignees/apply/`, {
    apiKey,
    method: "POST",
    body: JSON.stringify({
      assignee_username: assigneeUsername || null,
    }),
  });
}

export function applyIssueWatchers(apiKey, issueId, watcherUsernames) {
  return apiRequest(`/api/issues/${issueId}/watchers/apply/`, {
    apiKey,
    method: "POST",
    body: JSON.stringify({
      watcher_usernames: watcherUsernames,
    }),
  });
}

export function applyAssignee(apiKey, issueId, assigneeUsername) {
  return applyIssueAssignees(apiKey, issueId, assigneeUsername);
}

export function applyWatchers(apiKey, issueId, watcherUsernames) {
  return applyIssueWatchers(apiKey, issueId, watcherUsernames);
}

export function createIssueComment(apiKey, issueId, content) {
  return apiRequest(`/api/issues/${issueId}/comments/`, {
    apiKey,
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export function updateIssueComment(apiKey, commentId, content) {
  return apiRequest(`/api/comments/${commentId}/`, {
    apiKey,
    method: "PUT",
    body: JSON.stringify({ content }),
  });
}

export function deleteIssueComment(apiKey, commentId) {
  return apiRequest(`/api/comments/${commentId}/`, {
    apiKey,
    method: "DELETE",
  });
}

export function getIssueActivities(apiKey, issueId) {
  return apiRequest(`/api/issues/${issueId}/activities/`, { apiKey });
}

export function listIssueActivities(apiKey, issueId) {
  return getIssueActivities(apiKey, issueId);
}

export function getUserAvatar(apiKey, username) {
  return apiRequest(`/api/users/${username}/avatar/`, { apiKey });
}

export function getIssueAttachments(apiKey, issueId) {
  return apiRequest(`/api/issues/${issueId}/attachments/`, { apiKey });
}

export function createIssueAttachment(apiKey, issueId, file) {
  const body = new FormData();
  body.append("attachment", file);
  return apiRequest(`/api/issues/${issueId}/attachments/`, {
    apiKey,
    method: "POST",
    body,
  });
}

export function deleteIssueAttachment(apiKey, attachmentId) {
  return apiRequest(`/api/attachments/${attachmentId}/`, {
    apiKey,
    method: "DELETE",
  });
}

export function getIssueComments(apiKey, issueId) {
  return apiRequest(`/api/issues/${issueId}/comments/`, { apiKey });
}

export function listIssueComments(apiKey, issueId) {
  return getIssueComments(apiKey, issueId);
}
