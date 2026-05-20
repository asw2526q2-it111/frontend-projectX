import { useEffect, useMemo, useState } from "react";
import { getUser } from "../api/users";
import { FRONTEND_USERS } from "../config/users";
import { CurrentUserContext } from "./currentUser";

export function CurrentUserProvider({ children }) {
  const [currentUsername, setCurrentUsername] = useState(FRONTEND_USERS[0].username);
  const [currentUserDetails, setCurrentUserDetails] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const selectedUser =
      FRONTEND_USERS.find((user) => user.username === currentUsername) ?? FRONTEND_USERS[0];

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

  const value = useMemo(() => {
    const selectedUser =
      FRONTEND_USERS.find((user) => user.username === currentUsername) ?? FRONTEND_USERS[0];
    const currentUser = {
      ...selectedUser,
      ...currentUserDetails,
      fullName:
        currentUserDetails?.full_name ??
        currentUserDetails?.fullName ??
        selectedUser.fullName ??
        selectedUser.username,
      full_name:
        currentUserDetails?.full_name ??
        currentUserDetails?.fullName ??
        selectedUser.fullName ??
        selectedUser.username,
    };

    return {
      users: FRONTEND_USERS,
      currentUser,
      setCurrentUsername,
    };
  }, [currentUsername, currentUserDetails]);

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}
