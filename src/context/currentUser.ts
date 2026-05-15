import { createContext, useContext } from "react";
import type { FrontendUser } from "../config/users";

export type CurrentUserContextValue = {
  users: FrontendUser[];
  currentUser: FrontendUser;
  setCurrentUsername: (username: string) => void;
};

export const CurrentUserContext = createContext<CurrentUserContextValue | undefined>(undefined);

export function useCurrentUser() {
  const context = useContext(CurrentUserContext);
  if (!context) {
    throw new Error("useCurrentUser must be used inside CurrentUserProvider");
  }
  return context;
}
