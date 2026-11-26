import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { spacing } from '../../theme';

export default function SignIn() {
  const { t } = useI18n();
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  async function submit() {
    if (!email.trim() || !password) {
      setErrorKey('auth.error.required');
      return;
    }
    setBusy(true);
    setErrorKey(null);
    const result = await signIn(email.trim(), password);
    setBusy(false);
    // On success nothing else to do: the guards in the root layout move us to the right home.
    if (result.errorKey) setErrorKey(result.errorKey);
  }

  return (
    <Screen title={t('auth.signInTitle')}>
      <Card style={{ gap: spacing.md }}>
        <TextField
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <TextField
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          onSubmitEditing={submit}
        />
        {errorKey && <AppText color="danger">{t(errorKey)}</AppText>}
        <Button label={t('auth.signIn')} onPress={submit} busy={busy} />
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          <AppText color="muted">{t('auth.noAccount')}</AppText>
          <Pressable onPress={() => router.push('/sign-up' as Href)} accessibilityRole="link">
            <AppText variant="bodyMedium" color="plum">
              {t('auth.signUp')}
            </AppText>
          </Pressable>
        </View>
      </Card>
    </Screen>
  );
}
