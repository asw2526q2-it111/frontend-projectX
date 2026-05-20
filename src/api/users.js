import { apiRequest } from "./client";

export async function getUser(apiKey, username) {
  return apiRequest(`/api/users/${username}/`, { apiKey });
}

// 2. Actualizar el perfil
export async function updateUserProfile(apiKey, username, data) {
  const formData = new FormData();
  if (data.bio !== undefined) formData.append("bio", data.bio);
  if (data.avatar) formData.append("avatar", data.avatar);
  if (data.remove_avatar) formData.append("remove_avatar", "true");

  return apiRequest(`/api/users/${username}/`, {
    apiKey,
    method: "PATCH",
    body: formData,
  });
}

export async function listUsers(apiKey) {
  return apiRequest("/api/users/", { apiKey });
}

export function getUserIssues(apiKey, username, type, query = {}) {
  return apiRequest(`/api/users/${username}/${type}/`, { apiKey, query });
}

export function getUserComments(apiKey, username) {
  return apiRequest(`/api/users/${username}/comments/`, { apiKey });
}
