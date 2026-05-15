import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createIssue } from "../api/issues";
import { useCurrentUser } from "../context/currentUser";

export function IssueCreatePage() {
  const { currentUser } = useCurrentUser();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const issue = await createIssue(currentUser.apiKey, {
        title,
        description,
        deadline: deadline || null,
      });
      navigate(`/issues/${issue.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No s'ha pogut crear.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-stack compact-page">
      <div className="section-header">
        <div>
          <span className="eyebrow">Alta</span>
          <h2>Nova issue</h2>
        </div>
      </div>

      <form className="form-panel" onSubmit={handleSubmit}>
        <label>
          <span>Titol</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>

        <label>
          <span>Descripcio</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={8}
          />
        </label>

        <label>
          <span>Deadline</span>
          <input
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="form-actions">
          <button className="button" type="button" onClick={() => navigate("/issues")}>
            Cancel.lar
          </button>
          <button className="button button-primary" type="submit" disabled={saving}>
            {saving ? "Creant..." : "Crear issue"}
          </button>
        </div>
      </form>
    </section>
  );
}
