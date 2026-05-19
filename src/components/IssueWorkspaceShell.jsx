/**
 * Contenidor del layout «issue-workspace»: fons decoratiu i slot per al contingut.
 * S'usa a la llista d'issues i al detall d'issue.
 */

export function IssueWorkspaceShell({ pageClassName, children }) {
  return (
    <div className={pageClassName}>
      <div className="app-bg-shape app-bg-shape-left" aria-hidden="true" />
      <div className="app-bg-shape app-bg-shape-right" aria-hidden="true" />
      {children}
    </div>
  );
}
