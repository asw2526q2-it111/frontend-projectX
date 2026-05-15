import { FRONTEND_USERS } from "../config/users";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://asw-projectx.duckdns.org";

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function buildUrl(path, query) {
  const url = new URL(path, API_BASE_URL);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, item));
      return;
    }
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

export async function apiRequest(path, options = {}) {
  const { apiKey = FRONTEND_USERS[0]?.apiKey, query, headers, body, ...init } = options;
  const response = await fetch(buildUrl(path, query), {
    ...init,
    body,
    headers: {
      Accept: "application/json",
      ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
      ...headers,
    },
  });

  if (response.status === 204) return undefined;

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new ApiError("La peticio a l'API ha fallat.", response.status, data);
  }

  return data;
}
