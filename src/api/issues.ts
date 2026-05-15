import { apiRequest } from "./client";
import type {
  Issue,
  IssueActivity,
  IssueComment,
  IssueFilters,
  IssueListResponse,
  IssueWrite,
  ListResponse,
} from "../types/api";

export function listIssues(apiKey: string, filters: IssueFilters = {}) {
  return apiRequest<IssueListResponse>("/api/issues/", {
    apiKey,
    query: filters,
  });
}

export function getIssue(apiKey: string, issueId: string | number) {
  return apiRequest<Issue>(`/api/issues/${issueId}/`, { apiKey });
}

export function createIssue(apiKey: string, payload: IssueWrite) {
  return apiRequest<Issue>("/api/issues/", {
    apiKey,
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateIssue(apiKey: string, issueId: string | number, payload: Partial<IssueWrite>) {
  return apiRequest<Issue>(`/api/issues/${issueId}/`, {
    apiKey,
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteIssue(apiKey: string, issueId: string | number) {
  return apiRequest<void>(`/api/issues/${issueId}/`, {
    apiKey,
    method: "DELETE",
  });
}

export function assignMe(apiKey: string, issueId: string | number) {
  return apiRequest<Issue>(`/api/issues/${issueId}/assign-me/`, {
    apiKey,
    method: "POST",
  });
}

export function unassignMe(apiKey: string, issueId: string | number) {
  return apiRequest<Issue>(`/api/issues/${issueId}/unassign-me/`, {
    apiKey,
    method: "POST",
  });
}

export function watchIssue(apiKey: string, issueId: string | number) {
  return apiRequest<Issue>(`/api/issues/${issueId}/watch/`, {
    apiKey,
    method: "POST",
  });
}

export function unwatchIssue(apiKey: string, issueId: string | number) {
  return apiRequest<Issue>(`/api/issues/${issueId}/unwatch/`, {
    apiKey,
    method: "POST",
  });
}

export function listIssueComments(apiKey: string, issueId: string | number) {
  return apiRequest<ListResponse<IssueComment>>(`/api/issues/${issueId}/comments/`, { apiKey });
}

export function createIssueComment(apiKey: string, issueId: string | number, content: string) {
  return apiRequest<IssueComment>(`/api/issues/${issueId}/comments/`, {
    apiKey,
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export function listIssueActivities(apiKey: string, issueId: string | number) {
  return apiRequest<ListResponse<IssueActivity>>(`/api/issues/${issueId}/activities/`, { apiKey });
}
