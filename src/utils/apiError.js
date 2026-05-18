/**
 * Missatge llegible des d'errors de fetch / ApiError del client API.
 */
export function getApiActionErrorMessage(error, fallback) {
  if (error?.details?.detail) return String(error.details.detail);
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
