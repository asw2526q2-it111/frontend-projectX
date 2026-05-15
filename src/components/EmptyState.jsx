export function EmptyState({ title, description }) {
  return (
    <div className="state">
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
