/**
 * Avatar d'usuari: imatge (avatar_url) o inicials segons el context.
 * Variants: comment, sidebar, topbar, create (+ size per crear issue).
 */

import { getUserAvatarUrl, getUserInitials } from "../utils/user";

function getVariantStyles(variant, size) {
  if (variant === "create") {
    const base = `create-user-avatar create-user-avatar--${size}`;
    return {
      image: base,
      fallback: `${base} create-user-avatar--initials`,
      useSpan: true,
    };
  }

  const variants = {
    comment: { image: "avatar avatar--sm", fallback: "avatar avatar--sm" },
    sidebar: {
      image: "issue-user-avatar issue-user-avatar--small",
      fallback: "issue-user-avatar issue-user-avatar--small issue-user-avatar--initials",
      useSpan: true,
    },
    topbar: {
      image: "profile-avatar-large",
      fallback: "profile-avatar-large",
      useSpan: true,
    },
    profile: {
      image: "profile-avatar-large",
      fallback: "profile-avatar-large",
      useSpan: false,
    },
  };

  return variants[variant] ?? variants.comment;
}

export function UserAvatar({ user, variant = "comment", size = "md", className }) {
  if (!user) return null;

  const styles = getVariantStyles(variant, size);
  const avatarUrl = getUserAvatarUrl(user);
  const userInitials = getUserInitials(user);
  const imageClassName = className ?? styles.image;
  const fallbackClassName = className ?? styles.fallback;

  if (avatarUrl) {
    return (
      <img
        className={imageClassName}
        src={avatarUrl}
        alt={`${user.username ?? "user"}'s avatar`}
      />
    );
  }

  if (styles.useSpan) {
    return (
      <span className={fallbackClassName} aria-hidden="true">
        {userInitials}
      </span>
    );
  }

  return (
    <div className={fallbackClassName} aria-hidden="true">
      {userInitials}
    </div>
  );
}
