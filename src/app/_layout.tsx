import { Jost_400Regular, Jost_500Medium } from '@expo-google-fonts/jost';
import { Poppins_500Medium, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';
import { DevBar } from '../components/DevBar';
import { I18nProvider } from '../lib/i18n';
import { RoleProvider } from '../lib/role';
import { colors } from '../theme';

// Keep the splash screen up until fonts are ready.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Poppins_500Medium,
    Poppins_600SemiBold,
    Jost_400Regular,
    Jost_500Medium,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <I18nProvider>
      <RoleProvider>
        <View style={{ flex: 1, backgroundColor: colors.cream }}>
          <DevBar />
          <Stack screenOptions={{ headerShown: false }} />
        </View>
      </RoleProvider>
    </I18nProvider>
  );
}
