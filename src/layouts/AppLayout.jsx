import { FilePlus2, ListTodo, UserRound } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { UserSwitcher } from "../components/UserSwitcher";
import { useCurrentUser } from "../context/currentUser";

export function AppLayout() {
  const { currentUser } = useCurrentUser();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">IX</div>
          <div>
            <strong>Issue Hub</strong>
            <span>ProjectX</span>
          </div>
        </div>

        <nav className="nav">
          <NavLink to="/issues">
            <ListTodo size={18} aria-hidden="true" />
            Issues
          </NavLink>
          <NavLink to="/issues/new">
            <FilePlus2 size={18} aria-hidden="true" />
            Nova issue
          </NavLink>
          <NavLink to={`/profile/${currentUser.username}`}>
            <UserRound size={18} aria-hidden="true" />
            Perfil
          </NavLink>
        </nav>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <h1>Gestio d'incidencies</h1>
            <p>Client React connectat a l'API REST del projecte.</p>
          </div>
          <UserSwitcher />
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
