export function formatDate(value) {
  if (!value) return "Sense data";

  return new Intl.DateTimeFormat("ca-ES", {
    day: "2-digit",
    month: "numeric",
    year: "numeric",
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
