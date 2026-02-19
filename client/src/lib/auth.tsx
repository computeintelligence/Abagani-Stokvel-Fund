import { createContext, useContext, useState, useEffect } from "react";
import type { Member } from "@shared/schema";
import { apiRequest } from "./queryClient";

interface AuthContextType {
  member: Member | null;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  setMemberDirectly: (m: Member) => void;
}

const AuthContext = createContext<AuthContextType>({
  member: null,
  isLoading: true,
  login: async () => {},
  logout: () => {},
  refresh: async () => {},
  setMemberDirectly: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMember(data);
      } else {
        setMember(null);
      }
    } catch {
      setMember(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (phone: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { phone, password });
    const data = await res.json();
    setMember(data);
  };

  const setMemberDirectly = (m: Member) => {
    setMember(m);
    setIsLoading(false);
  };

  const logout = () => {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).then(() => {
      setMember(null);
    });
  };

  return (
    <AuthContext.Provider value={{ member, isLoading, login, logout, refresh, setMemberDirectly }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
