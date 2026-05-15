import { useParams } from "react-router-dom";
import { getUser, listAssignedIssues, listWatchedIssues } from "../api/users";
import { EmptyState } from "../components/EmptyState";
import { IssueCard } from "../components/IssueCard";
import { LoadingState } from "../components/LoadingState";
import { useCurrentUser } from "../context/currentUser";
import { useAsync } from "../hooks/useAsync";

export function ProfilePage() {
  const { username } = useParams();
  const { currentUser } = useCurrentUser();

  const userState = useAsync(() => getUser(currentUser.apiKey, username), [
    currentUser.apiKey,
    username,
  ]);
  const assignedState = useAsync(() => listAssignedIssues(currentUser.apiKey, username), [
    currentUser.apiKey,
    username,
  ]);
  const watchedState = useAsync(() => listWatchedIssues(currentUser.apiKey, username), [
    currentUser.apiKey,
    username,
  ]);

  if (userState.loading) return <LoadingState />;

  if (userState.error || !userState.data) {
    return (
      <EmptyState
        title="No s'ha pogut carregar el perfil"
        description={userState.error?.message ?? "Usuari no trobat."}
      />
    );
  }

  const user = userState.data;

  return (
    <section className="page-stack">
      <div className="profile-header">
        <div className="avatar">{user.initials}</div>
        <div>
          <span className="eyebrow">@{user.username}</span>
          <h2>{user.full_name}</h2>
          <p>{user.bio ?? "Aquest usuari encara no te biografia."}</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat">
          <span>Assignades</span>
          <strong>{user.assigned_count}</strong>
        </div>
        <div className="stat">
          <span>Seguides</span>
          <strong>{user.watched_count}</strong>
        </div>
      </div>

      <section className="split-grid">
        <div>
          <h3>Issues assignades</h3>
          <div className="issue-list">
            {assignedState.data?.results.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        </div>

        <div>
          <h3>Issues seguides</h3>
          <div className="issue-list">
            {watchedState.data?.results.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}
