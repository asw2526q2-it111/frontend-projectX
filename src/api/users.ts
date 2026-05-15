import { apiRequest } from "./client";
import type { IssueListResponse, ListResponse, UserDetail } from "../types/api";

export function getUser(apiKey: string, username: string) {
  return apiRequest<UserDetail>(`/api/users/${username}/`, { apiKey });
}

export function listAssignedIssues(apiKey: string, username: string) {
  return apiRequest<IssueListResponse>(`/api/users/${username}/assigned/`, { apiKey });
}

export function listWatchedIssues(apiKey: string, username: string) {
  return apiRequest<IssueListResponse>(`/api/users/${username}/watched/`, { apiKey });
}

export function listUserComments(apiKey: string, username: string) {
  return apiRequest<ListResponse<unknown>>(`/api/users/${username}/comments/`, { apiKey });
}
