import { Redirect, type Href } from 'expo-router';
import { ROLE_HOME, useRole } from '../lib/role';

// "/" just sends you to the first screen of the current role.
export default function Index() {
  const { role } = useRole();
  return <Redirect href={ROLE_HOME[role] as Href} />;
}
