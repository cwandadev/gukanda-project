import { Redirect, type Href } from 'expo-router';
import { useAuth } from '../lib/auth';
import { ROLE_HOME } from '../lib/role';

// "/" sends you to your role's home, or to sign in.
export default function Index() {
  const { profile } = useAuth();
  return <Redirect href={(profile ? ROLE_HOME[profile.role] : '/sign-in') as Href} />;
}
