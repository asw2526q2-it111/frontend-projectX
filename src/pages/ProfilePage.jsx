import { useState } from "react";
import { useParams } from "react-router-dom";
import { getUser } from "../api/users";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { useCurrentUser } from "../context/currentUser";
import { useAsync } from "../hooks/useAsync";

export function ProfilePage() {
  const { username } = useParams();
  const { currentUser } = useCurrentUser();

  // LA REGLA D'OR (Amb interrogant de seguretat ?.)
  const isOwnProfile = currentUser?.username === username;

  // ESTAT DE LES PESTANYES
  const [activeTab, setActiveTab] = useState("assigned");

  const userState = useAsync(() => getUser(currentUser?.apiKey, username), [
    currentUser?.apiKey,
    username,
  ]);

  if (!isOwnProfile && activeTab === "watched") {
    setActiveTab("assigned");
  }

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
      
      {/* HEADER DE L'USUARI (Fa servir l'estètica original) */}
      <div className="profile-header">
        <div className="avatar">
           {user.avatar_url ? (
            <img src={user.avatar_url} alt="Avatar" style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}}/>
           ) : (
            user.initials
           )}
        </div>
        <div>
          <span className="eyebrow">@{user.username}</span>
          <h2>{user.full_name}</h2>
          <p>{user.bio ?? "Aquest usuari encara no té biografia."}</p>
          
          {/* AC6: Botó EDIT BIO només pel propietari */}
          {isOwnProfile && (
            <button className="btn-primary" style={{ marginTop: "10px" }}>
              EDIT BIO
            </button>
          )}
        </div>
      </div>

      {/* ESTADÍSTIQUES */}
      <div className="stats-grid">
        <div className="stat">
          <span>Assignades</span>
          <strong>{user.assigned_count}</strong>
        </div>
        <div className="stat">
          <span>Seguides</span>
          <strong>{user.watched_count}</strong>
        </div>
        <div className="stat">
          <span>Comentaris</span>
          <strong>{user.comments_count}</strong>
        </div>
      </div>

      {/* PESTANYES NAVEGABLES */}
      <div style={{ display: "flex", gap: "1rem", borderBottom: "1px solid #ccc", marginBottom: "1rem" }}>
        <button 
          style={{ padding: "0.5rem 1rem", border: "none", background: "none", borderBottom: activeTab === "assigned" ? "2px solid #0ea5e9" : "2px solid transparent", cursor: "pointer", fontWeight: activeTab === "assigned" ? "bold" : "normal" }}
          onClick={() => setActiveTab("assigned")}
        >
          Open Assigned Issues
        </button>

        {isOwnProfile && (
          <button 
            style={{ padding: "0.5rem 1rem", border: "none", background: "none", borderBottom: activeTab === "watched" ? "2px solid #0ea5e9" : "2px solid transparent", cursor: "pointer", fontWeight: activeTab === "watched" ? "bold" : "normal" }}
            onClick={() => setActiveTab("watched")}
          >
            Watched Issues
          </button>
        )}

        <button 
          style={{ padding: "0.5rem 1rem", border: "none", background: "none", borderBottom: activeTab === "comments" ? "2px solid #0ea5e9" : "2px solid transparent", cursor: "pointer", fontWeight: activeTab === "comments" ? "bold" : "normal" }}
          onClick={() => setActiveTab("comments")}
        >
          Comments
        </button>
      </div>

      {/* CONTINGUT DE LA PESTANYA */}
      <section>
        {activeTab === "assigned" && (
           <div className="issue-list">
             [Aquí pintarem l'IssueCard amb la lògica d'ordenació]
           </div>
        )}
        
        {activeTab === "watched" && (
           <div className="issue-list">
             [Aquí pintarem l'IssueCard amb la lògica d'ordenació]
           </div>
        )}

        {activeTab === "comments" && (
           <div>[Llista de Comentaris amb botons d'edició]</div>
        )}
      </section>

    </section>
  );
}