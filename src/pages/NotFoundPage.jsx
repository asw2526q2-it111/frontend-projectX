import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";

export function NotFoundPage() {
  return (
    <section className="compact-page">
      <EmptyState
        title="Pagina no trobada"
        description="La ruta que has obert no existeix en aquest client."
      />
      <Link className="button button-primary" to="/issues">
        Anar a issues
      </Link>
    </section>
  );
}
