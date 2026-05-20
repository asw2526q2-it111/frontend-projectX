import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";

export function NotFoundPage() {
  return (
    <section className="compact-page">
      <EmptyState
        title="Page not found"
        description="The route you opened does not exist in this client."
      />
      <Link className="button button-primary" to="/issues">
        Go to issues
      </Link>
    </section>
  );
}
