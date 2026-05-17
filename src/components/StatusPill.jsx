export function StatusPill({ item }) {
  if (!item) return <span className="pill pill-muted">Sense valor</span>;

  return (
    <span className="pill" style={{ "--pill-color": item.color }}>
      {item.name}
    </span>
  );
}
