export function formatDate(value) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("ca-ES", {
    day: "2-digit",
    month: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

/** Format compact per dates a la sidebar (issue detail, etc.). */
export function formatSidebarDateTime(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("ca-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
