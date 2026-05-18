import { apiRequest } from "./client";

// Aquesta és la funció del teu company per a IssueCreatePage
export function listUsers(apiKey) {
  return apiRequest("/api/users/", { apiKey });
}

export function getUser(apiKey, username) {
  return apiRequest(`/api/users/${username}/`, { apiKey });
}

// Paràmetres d'ordenació afegits
export function listAssignedIssues(apiKey, username, sortBy = "updated", sortDir = "desc") {
  return apiRequest(`/api/users/${username}/assigned/`, {
    apiKey,
    query: { sort_by: sortBy, sort_direction: sortDir },
  });
}

// Paràmetres d'ordenació afegits
export function listWatchedIssues(apiKey, username, sortBy = "updated", sortDir = "desc") {
  return apiRequest(`/api/users/${username}/watched/`, {
    apiKey,
    query: { sort_by: sortBy, sort_direction: sortDir },
  });
}

export function listUserComments(apiKey, username) {
  return apiRequest(`/api/users/${username}/comments/`, { apiKey });
}

// Funció per pujar el formData (Avatar + Bio)
export function updateProfile(apiKey, username, formData) {
  return apiRequest(`/api/users/${username}/`, {
    apiKey,
    method: "PUT",
    body: formData,
  });
}