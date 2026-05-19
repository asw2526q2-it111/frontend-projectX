import { initials } from "./format";

/** URL d'avatar retornada per l'API (`avatar_url`) o variants legacy. */
export function getUserAvatarUrl(user) {
  if (!user) return null;
  return user.avatar_url ?? user.avatar ?? null;
}

export function getUserDisplayName(user) {
  if (!user) return "";
  return user.full_name ?? user.fullName ?? user.username ?? "";
}

export function getUserInitials(user) {
  if (!user) return "?";
  if (user.initials) return user.initials;
  return initials(getUserDisplayName(user) || user.username || "?");
}
