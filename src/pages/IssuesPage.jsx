import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { IssueCard } from "../components/IssueCard";
import { LoadingState } from "../components/LoadingState";
import { listIssues } from "../api/issues";
import { useCurrentUser } from "../context/currentUser";
import { useAsync } from "../hooks/useAsync";

export function IssuesPage() {
  const { currentUser } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("updated");

  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      sort_by: sortBy,
      sort_direction: "desc",
    }),
    [search, sortBy]
  );

  const { data, error, loading, reload } = useAsync(
    () => listIssues(currentUser.apiKey, filters),
    [currentUser.apiKey, filters]
  );

  return (
    <section className="page-stack">
      <div className="section-header">
        <div>
          <span className="eyebrow">Tauler</span>
          <h2>Issues</h2>
        </div>
        <Link className="button button-primary" to="/issues/new">
          Nova issue
        </Link>
      </div>

      <div className="toolbar">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar per titol o descripcio"
          />
        </label>

        <label className="select-field">
          <span>Ordenar</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="updated">Actualitzacio</option>
            <option value="issue">Numero</option>
            <option value="status">Estat</option>
            <option value="priority">Prioritat</option>
            <option value="severity">Severitat</option>
          </select>
        </label>

        <button className="button" type="button" onClick={() => void reload()}>
          Recarregar
        </button>
      </div>

      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="No s'han pogut carregar les issues" description={error.message} /> : null}
      {!loading && !error && data?.results.length === 0 ? (
        <EmptyState title="Cap issue trobada" description="Canvia els filtres o crea una issue nova." />
      ) : null}

      <div className="issue-list">
        {data?.results.map((issue) => (
          <IssueCard key={issue.id} issue={issue} />
        ))}
      </div>
    </section>
  );
}
