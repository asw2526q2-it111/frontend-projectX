import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { bulkCreateIssues } from "../api/issues";
import { useCurrentUser } from "../context/currentUser";

function getErrorMessage(error) {
  if (error?.details?.detail) return String(error.details.detail);
  if (Array.isArray(error?.details?.text) && error.details.text[0]) {
    return String(error.details.text[0]);
  }
  if (error instanceof Error && error.message) return error.message;
  return "Could not create issues.";
}

export function BulkInsertPage() {
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();

  const [titles, setTitles] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await bulkCreateIssues(currentUser.apiKey, {
        text: titles,
      });

      navigate("/issues");
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="issue-create-page">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">IX</div>
          <div>
            <h1>Issue Hub</h1>
            <p>Bulk insert issues</p>
          </div>
        </div>

        <div className="topbar-actions">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => navigate("/issues")}
          >
            Back to issues
          </button>
        </div>
      </header>

      <main className="create-layout issue-shell">
        <div className="panel">
          <h2 className="bulk-title">Bulk Insert Issues</h2>
          <p className="bulk-intro">
            Enter <strong>one issue title per line</strong>. Each line will generate an
            independent issue. Empty lines will be ignored by the backend.
          </p>

          <form onSubmit={handleSubmit}>
            <textarea
              name="bulk_titles"
              className="bulk-textarea"
              value={titles}
              onChange={(event) => setTitles(event.target.value)}
              placeholder={`Example:
Fix login button hover state
Update documentation for API v2
Refactor database queries`}
              autoFocus
              rows={12}
            />

            {error ? <p className="form-error">{error}</p> : null}

            <div className="form-actions">
              <button className="button" type="button" onClick={() => navigate("/issues")}>
                Cancel
              </button>
              <button className="button button-primary" type="submit" disabled={saving || !titles.trim()}>
                {saving ? "Creating..." : "Create issues"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </section>
  );
}
