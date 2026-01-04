"use client";

import { createContext, useContext, ReactNode } from "react";

export interface UserContextType {
  id: string;
  email: string;
  full_name: string | null;
  created_at: Date;
  updated_at: Date;
  role: "member" | "admin";
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  value: UserContextType;
  children: ReactNode;
}

export function UserProvider({ value, children }: UserProviderProps) {
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
