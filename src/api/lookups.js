import { apiRequest } from "./client";

export function listLookup(apiKey, resource) {
  return apiRequest(`/api/${resource}/`, { apiKey });
}

export function createLookup(apiKey, resource, payload) {
  return apiRequest(`/api/${resource}/`, {
    apiKey,
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateLookup(apiKey, resource, lookupName, payload) {
  return apiRequest(`/api/${resource}/${encodeURIComponent(lookupName)}/`, {
    apiKey,
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteLookup(apiKey, resource, lookupName) {
  return apiRequest(`/api/${resource}/${encodeURIComponent(lookupName)}/`, {
    apiKey,
    method: "DELETE",
  });
}

export function listStatuses(apiKey) {
  return apiRequest("/api/statuses/", { apiKey });
}
