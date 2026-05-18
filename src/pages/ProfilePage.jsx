import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getUser } from "../api/users";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { useCurrentUser } from "../context/currentUser";
import { useAsync } from "../hooks/useAsync";
import "../styles/Profile.css";

export function ProfilePage() {
  const { username } = useParams();
  const { currentUser } = useCurrentUser();
  const isOwnProfile = currentUser?.username === username;
  const [activeTab, setActiveTab] = useState("assigned");

  const userState = useAsync(() => getUser(currentUser?.apiKey, username), [
    currentUser?.apiKey,
    username,
  ]);

  if (!isOwnProfile && activeTab === "watched") setActiveTab("assigned");

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
    <div className="profile-page-wrapper">
      <header className="profile-topbar">
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div className="brand-mark" style={{ width: '2.3rem', height: '2.3rem', borderRadius: '0.6rem', background: 'linear-gradient(145deg, #0d8aa8, #23a5c6)', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 'bold' }}>IX</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Issue Hub</h1>
            <p style={{ margin: 0, color: '#617487', fontSize: '0.9rem' }}>User Profile</p>
          </div>
        </div>
        <div className="topbar-actions">
          <Link className="btn btn-secondary" to="/issues" style={{ padding: '0.6rem 0.85rem', border: '1px solid #dde6ee', borderRadius: '0.7rem', textDecoration: 'none', color: '#1f2d3d', fontWeight: '600' }}>
            &larr; Back to issues
          </Link>
        </div>
      </header>

      <main className="profile-layout">
        <aside className="profile-sidebar">
          <section className="profile-sidebar-panel">
            <div className="profile-avatar-large">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={`${user.username} avatar`} />
              ) : (
                user.initials
              )}
            </div>
            
            <h2 className="profile-name">{user.full_name || user.username}</h2>
            <p className="profile-username">@{user.username}</p>

            <div className={`profile-stats-grid ${isOwnProfile ? 'profile-stats-grid--three' : 'profile-stats-grid--two'}`}>
              <div>
                <span className="stat-num">{user.assigned_count}</span>
                <span className="stat-label">Assigned</span>
              </div>
              {isOwnProfile && (
                <div>
                  <span className="stat-num">{user.watched_count}</span>
                  <span className="stat-label">Watched</span>
                </div>
              )}
              <div>
                <span className="stat-num">{user.comments_count}</span>
                <span className="stat-label">Comments</span>
              </div>
            </div>

            <div className="bio-section">
              {user.bio ? (
                <p style={{ whiteSpace: "pre-wrap" }}>{user.bio}</p>
              ) : (
                <span style={{ color: "#94a3b8", fontStyle: "italic" }}>No bio available.</span>
              )}
            </div>

            {isOwnProfile && (
              <div className="api-key-section">
                <h3 style={{ fontSize: "0.875rem", color: "#64748b", margin: "0 0 0.5rem", textTransform: "uppercase" }}>Your API Key</h3>
                <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "0 0 0.5rem" }}>Use this key to authenticate in Swagger.</p>
                <div style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "0.5rem" }}>
                  <code style={{ fontSize: "0.8rem", color: "#0f172a", wordBreak: "break-all" }}>
                    {user.api_key || currentUser?.apiKey}
                  </code>
                </div>
              </div>
            )}

            {isOwnProfile && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1.5rem' }}>
                <button style={{ padding: '0.6rem', background: '#0d8aa8', color: 'white', border: 'none', borderRadius: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}>Edit Profile</button>
                <button style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer', padding: '0.5rem' }}>SIGN OUT</button>
              </div>
            )}
          </section>
        </aside>

        <section className="profile-content">
          <div className="tabs-header">
            <div className={`tab-item ${activeTab === 'assigned' ? 'active' : ''}`} onClick={() => setActiveTab('assigned')}>
              Open Assigned Issues
            </div>
            {isOwnProfile && (
              <div className={`tab-item ${activeTab === 'watched' ? 'active' : ''}`} onClick={() => setActiveTab('watched')}>
                Watched Issues
              </div>
            )}
            <div className={`tab-item ${activeTab === 'comments' ? 'active' : ''}`} onClick={() => setActiveTab('comments')}>
              Comments
            </div>
          </div>

          <div className="profile-content-body">
            {activeTab === "assigned" && (
              <div className="issues-table-wrap">
                [Aquí pintarem la taula per a ASSIGNADES]
              </div>
            )}
            
            {activeTab === "watched" && (
              <div className="issues-table-wrap">
                [Aquí pintarem la taula per a SEGUIDES]
              </div>
            )}

            {activeTab === "comments" && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                No comments yet.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}