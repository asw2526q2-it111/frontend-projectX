import { apiRequest } from "./client";
import type { ListResponse, Lookup, Status } from "../types/api";

export type LookupResource = "priorities" | "severities" | "statuses" | "tags" | "types";

export function listLookup(apiKey: string, resource: Exclude<LookupResource, "statuses">) {
  return apiRequest<ListResponse<Lookup>>(`/api/${resource}/`, { apiKey });
}

export function listStatuses(apiKey: string) {
  return apiRequest<ListResponse<Status>>("/api/statuses/", { apiKey });
}
