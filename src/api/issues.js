import { apiRequest } from "./client";

export function listIssues(apiKey, filters = {}) {
  const query = {
    ...filters,
    q: filters.search ?? filters.q,
    sort: filters.sort_by ?? filters.sort,
    dir: filters.sort_direction ?? filters.dir,
  };

  delete query.search;
  delete query.sort_by;
  delete query.sort_direction;

  return apiRequest("/api/issues/", {
    apiKey,
    query,
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
    method: "POST",
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
    method: "POST",
  });
}

export function listIssueComments(apiKey, issueId) {
  return apiRequest(`/api/issues/${issueId}/comments/`, { apiKey });
}

export function createIssueComment(apiKey, issueId, content) {
  return apiRequest(`/api/issues/${issueId}/comments/`, {
    apiKey,
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export function listIssueActivities(apiKey, issueId) {
  return apiRequest(`/api/issues/${issueId}/activities/`, { apiKey });
}
