import { useCurrentUser } from "../context/currentUser";

export function UserSwitcher({ label = "Active user" }) {
  const { users, currentUsername, setCurrentUsername } = useCurrentUser();

  return (
    <label className="user-switcher">
      <span>{label}</span>
      <select
        value={currentUsername}
        onChange={(event) => setCurrentUsername(event.target.value)}
      >
        {users.map((user) => (
          <option key={user.username} value={user.username}>
            {user.fullName}
          </option>
        ))}
      </select>
    </label>
  );
}
