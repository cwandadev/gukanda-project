// Roles and where each role lands after login. (The temporary role switch is gone:
// the role now comes from the database, see lib/auth.tsx.)
export type Role = 'client' | 'practitioner' | 'admin';

export const ROLE_HOME: Record<Role, string> = {
  client: '/home',
  practitioner: '/dashboard',
  admin: '/team',
};
