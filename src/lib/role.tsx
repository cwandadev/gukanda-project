// TEMPORARY: holds the role we are previewing. Real roles come from Supabase later.
import { createContext, useContext, useState, type ReactNode } from 'react';

export type Role = 'client' | 'practitioner' | 'admin';
export const ROLES: Role[] = ['client', 'practitioner', 'admin'];

// First screen of each role.
export const ROLE_HOME: Record<Role, string> = {
  client: '/home',
  practitioner: '/dashboard',
  admin: '/team',
};

type RoleValue = { role: Role; setRole: (r: Role) => void };
const RoleContext = createContext<RoleValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('client');
  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used inside <RoleProvider>');
  return ctx;
}
