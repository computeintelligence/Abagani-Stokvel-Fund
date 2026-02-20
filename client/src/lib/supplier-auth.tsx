import { createContext, useContext, useState, useEffect } from "react";
import type { Supplier } from "@shared/schema";
import { apiRequest } from "./queryClient";

type SafeSupplier = Omit<Supplier, "password">;

interface SupplierAuthContextType {
  supplier: SafeSupplier | null;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  setSupplierDirectly: (s: SafeSupplier) => void;
}

const SupplierAuthContext = createContext<SupplierAuthContextType>({
  supplier: null,
  isLoading: true,
  login: async () => {},
  logout: () => {},
  refresh: async () => {},
  setSupplierDirectly: () => {},
});

export function SupplierAuthProvider({ children }: { children: React.ReactNode }) {
  const [supplier, setSupplier] = useState<SafeSupplier | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await fetch("/api/supplier/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSupplier(data);
      } else {
        setSupplier(null);
      }
    } catch {
      setSupplier(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (phone: string, password: string) => {
    const res = await apiRequest("POST", "/api/supplier/login", { phone, password });
    const data = await res.json();
    setSupplier(data);
  };

  const setSupplierDirectly = (s: SafeSupplier) => {
    setSupplier(s);
    setIsLoading(false);
  };

  const logout = () => {
    fetch("/api/supplier/logout", { method: "POST", credentials: "include" }).then(() => {
      setSupplier(null);
    });
  };

  return (
    <SupplierAuthContext.Provider value={{ supplier, isLoading, login, logout, refresh, setSupplierDirectly }}>
      {children}
    </SupplierAuthContext.Provider>
  );
}

export const useSupplierAuth = () => useContext(SupplierAuthContext);
