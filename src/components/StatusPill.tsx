import type { Lookup } from "../types/api";

export function StatusPill({ item }: { item?: Lookup | null }) {
  if (!item) return <span className="pill pill-muted">Sense valor</span>;

  return (
    <span className="pill" style={{ "--pill-color": item.color } as React.CSSProperties}>
      {item.name}
    </span>
  );
}
