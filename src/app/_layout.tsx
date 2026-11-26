import { Jost_400Regular, Jost_500Medium } from '@expo-google-fonts/jost';
import { Poppins_500Medium, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { DevBar } from '../components/DevBar';
import { ProfileProblem } from '../components/ProfileProblem';
import { AuthProvider, useAuth } from '../lib/auth';
import { I18nProvider } from '../lib/i18n';
import { colors } from '../theme';

// Keep the splash screen up until fonts AND the login state are ready.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({ Poppins_500Medium, Poppins_600SemiBold, Jost_400Regular, Jost_500Medium });
  if (!loaded && !error) return null;

  return (
    <I18nProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </I18nProvider>
  );
}

function AppShell() {
  const { session, profile, loading, profileError } = useAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  let body;
  if (loading) {
    body = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.plum} />
      </View>
    );
  } else if (session && (profileError || !profile)) {
    body = <ProfileProblem />;
  } else {
    // ROLE-BASED ROUTING: each group is reachable only by its role. Anything else is
    // redirected by Expo Router. (This is for navigation only; the real protection is
    // the database policies, which hold even if someone bypasses the app.)
    const role = profile?.role;
    body = (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'client'}>
          <Stack.Screen name="(client)" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'practitioner'}>
          <Stack.Screen name="(practitioner)" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'admin'}>
          <Stack.Screen name="(admin)" />
        </Stack.Protected>
        <Stack.Protected guard={__DEV__ && !!session}>
          <Stack.Screen name="icon-test" />
        </Stack.Protected>
      </Stack>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <DevBar />
      {body}
    </View>
  );
}
