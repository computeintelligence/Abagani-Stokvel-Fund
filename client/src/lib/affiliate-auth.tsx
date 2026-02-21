import { createContext, useContext, useState, useEffect } from "react";
import type { Affiliate } from "@shared/schema";
import { apiRequest } from "./queryClient";

type SafeAffiliate = Omit<Affiliate, "password">;

interface AffiliateAuthContextType {
  affiliate: SafeAffiliate | null;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  setAffiliateDirectly: (a: SafeAffiliate) => void;
}

const AffiliateAuthContext = createContext<AffiliateAuthContextType>({
  affiliate: null,
  isLoading: true,
  login: async () => {},
  logout: () => {},
  refresh: async () => {},
  setAffiliateDirectly: () => {},
});

export function AffiliateAuthProvider({ children }: { children: React.ReactNode }) {
  const [affiliate, setAffiliate] = useState<SafeAffiliate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await fetch("/api/affiliate/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAffiliate(data);
      } else {
        setAffiliate(null);
      }
    } catch {
      setAffiliate(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (phone: string, password: string) => {
    const res = await apiRequest("POST", "/api/affiliate/login", { phone, password });
    const data = await res.json();
    setAffiliate(data);
  };

  const setAffiliateDirectly = (a: SafeAffiliate) => {
    setAffiliate(a);
    setIsLoading(false);
  };

  const logout = () => {
    fetch("/api/affiliate/logout", { method: "POST", credentials: "include" }).then(() => {
      setAffiliate(null);
    });
  };

  return (
    <AffiliateAuthContext.Provider value={{ affiliate, isLoading, login, logout, refresh, setAffiliateDirectly }}>
      {children}
    </AffiliateAuthContext.Provider>
  );
}

export const useAffiliateAuth = () => useContext(AffiliateAuthContext);
