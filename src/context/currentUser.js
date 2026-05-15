import { createContext, useContext } from "react";

export const CurrentUserContext = createContext(undefined);

export function useCurrentUser() {
  const context = useContext(CurrentUserContext);
  if (!context) {
    throw new Error("useCurrentUser must be used inside CurrentUserProvider");
  }
  return context;
}
