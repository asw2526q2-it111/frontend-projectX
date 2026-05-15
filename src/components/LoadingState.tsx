export function LoadingState({ label = "Carregant..." }: { label?: string }) {
  return <div className="state state-loading">{label}</div>;
}
