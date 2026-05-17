import { apiRequest } from "./client";

export function getUser(apiKey, username) {
  return apiRequest(`/api/users/${username}/`, { apiKey });
}

export function listAssignedIssues(apiKey, username) {
  return apiRequest(`/api/users/${username}/assigned/`, { apiKey });
}

export function listWatchedIssues(apiKey, username) {
  return apiRequest(`/api/users/${username}/watched/`, { apiKey });
}

export function listUserComments(apiKey, username) {
  return apiRequest(`/api/users/${username}/comments/`, { apiKey });
}
