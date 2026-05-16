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
  const defaultHeaders = {
    Accept: "application/json",
    ...(apiKey ? { "X-API-Key": apiKey } : {}),
  };

  if (body && !(body instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  const requestUrl = buildUrl(path, query);
  let response;

  try {
    response = await fetch(requestUrl, {
      ...init,
      body,
      headers: { ...defaultHeaders, ...headers },
    });
  } catch (error) {
    throw new ApiError(
      `No s'ha pogut connectar amb l'API a ${requestUrl}. Revisa la URL base, que el backend estigui actiu i la configuracio CORS.`,
      0,
      error instanceof Error ? error.message : String(error)
    );
  }

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
