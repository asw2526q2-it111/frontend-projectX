import { apiRequest } from "./client";

export function listLookup(apiKey, resource) {
  return apiRequest(`/api/${resource}/`, { apiKey });
}

export function listStatuses(apiKey) {
  return apiRequest("/api/statuses/", { apiKey });
}
