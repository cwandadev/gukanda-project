// The ONE Supabase client. Only the public URL and the publishable key live in the app.
// The secret / service_role key must never be here (see .env.example).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local. ' +
      'Fill it in, then restart with: bunx expo start -c',
  );
}

export const supabase = createClient(url, key, {
  auth: {
    // Phone: keep the login session in AsyncStorage. Web: supabase-js uses localStorage itself.
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // no email-link handling yet (comes with the email chunk)
  },
});

// Phone only: refresh the login token while the app is on screen, pause it in the background.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
