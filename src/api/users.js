// 1. Obtener los detalles de un usuario concreto (LA QUE FALTABA)
export async function getUser(apiKey, username) {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/${username}/`, {
    method: "GET",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("No s'ha pogut carregar el perfil de l'usuari");
  }

  return response.json();
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
    throw new Error(errorData.detail || "Error al actualizar el perfil");
  }

  return response.json();
}

// 3. Listar todos los usuarios
export async function listUsers(apiKey) {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/`, {
    method: "GET",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Error en llistar els usuaris");
  }

  const data = await response.json();
  return data.results || data;
}