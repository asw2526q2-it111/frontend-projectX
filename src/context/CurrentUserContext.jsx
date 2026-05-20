import { useEffect, useMemo, useState } from "react";
import { getUser } from "../api/users";
import { FRONTEND_USERS } from "../config/users";
import { CurrentUserContext } from "./currentUser";

const CURRENT_USER_STORAGE_KEY = "projectx.currentUsername";

function isKnownUsername(username) {
  return FRONTEND_USERS.some((user) => user.username === username);
}

function getInitialUsername() {
  if (typeof window === "undefined") return FRONTEND_USERS[0].username;

  const storedUsername = window.localStorage.getItem(CURRENT_USER_STORAGE_KEY);
  return isKnownUsername(storedUsername) ? storedUsername : FRONTEND_USERS[0].username;
}

export function CurrentUserProvider({ children }) {
  const [currentUsername, setCurrentUsername] = useState(getInitialUsername);
  const [currentUserDetails, setCurrentUserDetails] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const selectedUser =
      FRONTEND_USERS.find((user) => user.username === currentUsername) ?? FRONTEND_USERS[0];

    setCurrentUserDetails(null);

    async function loadCurrentUserDetails() {
      try {
        const user = await getUser(selectedUser.apiKey, selectedUser.username);
        if (!cancelled) {
          setCurrentUserDetails(user);
        }
      } catch {
        if (!cancelled) {
          setCurrentUserDetails(null);
        }
      }
    }

    void loadCurrentUserDetails();

    return () => {
      cancelled = true;
    };
  }, [currentUsername]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, currentUsername);
  }, [currentUsername]);

  const value = useMemo(() => {
    const selectedUser =
      FRONTEND_USERS.find((user) => user.username === currentUsername) ?? FRONTEND_USERS[0];
    const selectedUserDetails =
      currentUserDetails?.username === selectedUser.username ? currentUserDetails : null;
    const currentUser = {
      ...selectedUser,
      ...selectedUserDetails,
      fullName:
        selectedUserDetails?.full_name ??
        selectedUserDetails?.fullName ??
        selectedUser.fullName ??
        selectedUser.username,
      full_name:
        selectedUserDetails?.full_name ??
        selectedUserDetails?.fullName ??
        selectedUser.fullName ??
        selectedUser.username,
      initials: selectedUserDetails?.initials ?? selectedUser.initials,
    };

    return {
      users: FRONTEND_USERS,
      currentUsername,
      currentUser,
      setCurrentUsername,
    };
  }, [currentUsername, currentUserDetails]);

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}
