import { useMemo, useState, type ReactNode } from "react";
import { FRONTEND_USERS } from "../config/users";
import { CurrentUserContext } from "./currentUser";

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [currentUsername, setCurrentUsername] = useState(FRONTEND_USERS[0].username);

  const value = useMemo(() => {
    const currentUser =
      FRONTEND_USERS.find((user) => user.username === currentUsername) ?? FRONTEND_USERS[0];

    return {
      users: FRONTEND_USERS,
      currentUser,
      setCurrentUsername,
    };
  }, [currentUsername]);

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}
