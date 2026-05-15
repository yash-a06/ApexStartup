import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useUser as useClerkUser } from "@clerk/react";
import { useUpsertUser } from "@workspace/api-client-react";

interface UserContextType {
  userId: string;
  username: string;
  setUsername: (username: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useClerkUser();
  const [username, setUsernameState] = useState<string>("");
  const upsertUser = useUpsertUser();

  const userId = user?.id ?? "";

  useEffect(() => {
    if (!isLoaded || !user) return;

    const derivedUsername =
      user.username ||
      (user.firstName && user.lastName
        ? `${user.firstName}${user.lastName}`
        : null) ||
      user.firstName ||
      user.primaryEmailAddress?.emailAddress?.split("@")[0] ||
      `apex_${user.id.slice(-6)}`;

    setUsernameState(derivedUsername);

    upsertUser.mutate({
      data: {
        id: user.id,
        username: derivedUsername,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user?.id]);

  const setUsername = (newUsername: string) => {
    if (!userId) return;
    setUsernameState(newUsername);
    upsertUser.mutate({
      data: {
        id: userId,
        username: newUsername,
      },
    });
  };

  return (
    <UserContext.Provider value={{ userId, username, setUsername }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
