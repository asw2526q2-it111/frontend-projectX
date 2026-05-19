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
    throw new Error(errorData.detail || "Error al actualizar el perfil");
  }

  return response.json();
}