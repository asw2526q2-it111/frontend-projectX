import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getUser, updateUserProfile } from "../api/users";
import { useCurrentUser } from "../context/currentUser";
import { LoadingState } from "../components/LoadingState";
import "../styles/profileedit.css";

export function ProfileEditPage() {
  const { username } = useParams();
  const { currentUser } = useCurrentUser();
  const navigate = useNavigate();

  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 1. Cargar datos actuales
  useEffect(() => {
    getUser(currentUser?.apiKey, username).then(data => {
      setBio(data.bio || "");
      setPreviewUrl(data.avatar_url);
      setLoading(false);
    });
  }, [username, currentUser?.apiKey]);

  // 2. Manejar cambio de imagen
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      setPreviewUrl(URL.createObjectURL(file)); // Vista previa instantánea
    }
  };

  // 3. Guardar cambios
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUserProfile(currentUser?.apiKey, username, { bio, avatar });
      navigate(`/profile/${username}`); // Volver al perfil
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="profile-edit-wrapper">
      <header className="profile-topbar">
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div className="brand-mark" style={{ width: '2.3rem', height: '2.3rem', borderRadius: '0.6rem', background: 'linear-gradient(145deg, #0d8aa8, #23a5c6)', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 'bold' }}>IX</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Issue Hub</h1>
            <p style={{ margin: 0, color: '#617487', fontSize: '0.9rem' }}>Edit Profile</p>
          </div>
        </div>
        <div className="topbar-actions">
          <Link className="btn btn-secondary" to={`/profile/${username}`}>Cancel</Link>
        </div>
      </header>

      <main className="edit-layout">
        <div className="profile-edit-panel">
          <h2 className="profile-edit-heading">Edit @{username}</h2>

          <form onSubmit={handleSubmit}>
            <section className="profile-avatar-upload">
              <h3 style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '1rem' }}>Avatar Upload Section</h3>
              <div className="avatar-preview--centered">
                {previewUrl ? <img src={previewUrl} alt="Preview" /> : username.charAt(0).toUpperCase()}
              </div>

              <div style={{ margin: '1rem 0' }}>
                <input type="file" accept="image/png,image/jpeg" onChange={handleFileChange} />
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Allowed formats: PNG or JPEG. Max size: 2 MB.</p>
            </section>

            <div className="form-field">
              <label htmlFor="bio">Biography</label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us a little bit about yourself..."
              />
            </div>

            <div className="profile-edit-actions">
              <Link className="btn btn-secondary" to={`/profile/${username}`}>Cancel</Link>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
