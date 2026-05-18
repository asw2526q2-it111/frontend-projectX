/**
 * Usuari associat a una entrada d'activitat (el backend pot usar camps diferents).
 */
export function getActivityActor(item) {
  return item.actor ?? item.user ?? item.created_by ?? null;
}
