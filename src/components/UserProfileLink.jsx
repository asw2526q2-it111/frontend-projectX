/**
 * Enllaç al perfil d'un usuari (/profile/:username).
 * Layouts: sidebar, author (comentaris), creator, mention (@username).
 */

import { Link } from "react-router-dom";
import { getUserDisplayName } from "../utils/user";
import { UserAvatar } from "./UserAvatar";

export function UserProfileLink({
  user,
  layout = "sidebar",
  avatarVariant,
  className = "",
}) {
  if (!user?.username) return null;

  const profilePath = `/profile/${user.username}`;
  const title = `View ${user.username}'s profile`;
  const displayName = getUserDisplayName(user) || user.username;

  if (layout === "mention") {
    return (
      <Link
        className={`user-profile-link user-profile-link--mention${className ? ` ${className}` : ""}`}
        to={profilePath}
        title={title}
      >
        @{user.username}
      </Link>
    );
  }

  if (layout === "author") {
    return (
      <Link
        className={`comment-item__author user-profile-link user-profile-link--author${className ? ` ${className}` : ""}`}
        to={profilePath}
        title={title}
      >
        <UserAvatar user={user} variant={avatarVariant ?? "comment"} />
        <strong>{displayName}</strong>
      </Link>
    );
  }

  if (layout === "creator") {
    return (
      <Link
        className={`main-box__creator-link user-profile-link user-profile-link--creator${className ? ` ${className}` : ""}`}
        to={profilePath}
        title={title}
      >
        <UserAvatar user={user} variant={avatarVariant ?? "comment"} />
        <span className="main-box__creator-name">@{user.username}</span>
      </Link>
    );
  }

  return (
    <Link
      className={`issue-person-item issue-person-link user-profile-link${className ? ` ${className}` : ""}`}
      to={profilePath}
      title={title}
    >
      <UserAvatar user={user} variant={avatarVariant ?? "sidebar"} />
      <span className="issue-person-name">{user.username}</span>
    </Link>
  );
}
