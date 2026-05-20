/**
 * Fila de metadades al sidebar del detall d'issue (Type, Priority, Deadline…).
 * Mostra etiqueta, valor i opcionalment un punt de color.
 */

export function IssueMetaRow({ label, value, color, soft = false }) {
  const hasDot = Boolean(color && value && value !== "-");

  return (
    <div className="issue-meta-row">
      <span className="issue-meta-key">{label}</span>
      {soft || !value || value === "-" ? (
        <span className="issue-meta-value issue-meta-value--soft">-</span>
      ) : (
        <span
          className={`issue-meta-value${hasDot ? " issue-meta-value--dot" : ""}`}
          style={!hasDot && color ? { color } : undefined}
        >
          {value}
          {hasDot ? <span className="issue-meta-dot" style={{ background: color }} /> : null}
        </span>
      )}
    </div>
  );
}
