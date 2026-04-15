"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthenticatedResident } from "@/lib/resident-auth";

type ResidentAuthContextValue = {
  resident: AuthenticatedResident | null;
  isAuthenticated: boolean;
  signIn: (nextResident: AuthenticatedResident) => void;
  signOut: () => void;
};

const ResidentAuthContext = createContext<ResidentAuthContextValue | undefined>(undefined);

export function ResidentAuthProvider({
  children,
  initialResident,
}: {
  children: ReactNode;
  initialResident: AuthenticatedResident | null;
}) {
  const [resident, setResident] = useState<AuthenticatedResident | null>(initialResident);

  useEffect(() => {
    setResident(initialResident);
  }, [initialResident]);

  const value = useMemo<ResidentAuthContextValue>(
    () => ({
      resident,
      isAuthenticated: resident !== null,
      signIn: (nextResident) => setResident(nextResident),
      signOut: () => setResident(null),
    }),
    [resident]
  );

  return <ResidentAuthContext.Provider value={value}>{children}</ResidentAuthContext.Provider>;
}

export function useResidentAuth() {
  const context = useContext(ResidentAuthContext);

  if (!context) {
    throw new Error("useResidentAuth must be used within ResidentAuthProvider.");
  }

  return context;
}
