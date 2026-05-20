import { apiRequest } from "./client";
import { normalizePagedList } from "../utils/apiList";

export async function getUser(apiKey, username) {
  return apiRequest(`/api/users/${username}/`, { apiKey });
}

// 2. Actualizar el perfil
export async function updateUserProfile(apiKey, username, data) {
  const formData = new FormData();
  if (data.bio !== undefined) formData.append("bio", data.bio);
  if (data.avatar) formData.append("avatar", data.avatar);
  if (data.remove_avatar) formData.append("remove_avatar", "true");

  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/${username}/`, {
    method: "PATCH", 
    headers: {
      "X-API-Key": apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Could not update the profile");
  }

  return response.json();
}

export async function listUsers(apiKey) {
  const data = await apiRequest("/api/users/", { apiKey });
  return normalizePagedList(data);
}

export function getUserIssues(apiKey, username, type, query = {}) {
  return apiRequest(`/api/users/${username}/${type}/`, { apiKey, query });
}

export function getUserComments(apiKey, username) {
  return apiRequest(`/api/users/${username}/comments/`, { apiKey });
}
