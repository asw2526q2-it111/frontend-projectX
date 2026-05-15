export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="state">
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
