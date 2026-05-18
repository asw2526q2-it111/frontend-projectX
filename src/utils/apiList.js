/**
 * Normalitza respostes de llista de l'API (array pla o paginació estil DRF `{ results }`).
 */
export function normalizePagedList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
}
