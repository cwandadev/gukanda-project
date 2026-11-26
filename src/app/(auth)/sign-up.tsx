import { useRouter } from 'expo-router';
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

const MIN_PASSWORD = 8;

export default function SignUp() {
  const { t } = useI18n();
  const { signUp } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function submit() {
    if (!fullName.trim() || !email.trim() || !password) {
      setErrorKey('auth.error.required');
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setErrorKey('auth.error.shortPassword');
      return;
    }
    setBusy(true);
    setErrorKey(null);
    const result = await signUp(email.trim(), password, fullName.trim());
    setBusy(false);
    if (result.errorKey) setErrorKey(result.errorKey);
    else if (result.needsEmailConfirmation) setCheckEmail(true);
    // Otherwise we are signed in already and the root layout routes us.
  }

  if (checkEmail) {
    return (
      <Screen title={t('auth.signUpTitle')}>
        <Card style={{ gap: spacing.md }}>
          <AppText>{t('auth.checkEmail')}</AppText>
          <Button label={t('auth.signIn')} variant="secondary" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title={t('auth.signUpTitle')}>
      <Card style={{ gap: spacing.md }}>
        <TextField label={t('auth.fullName')} value={fullName} onChangeText={setFullName} autoComplete="name" />
        <TextField
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <TextField
          label={`${t('auth.password')} (${t('auth.passwordHint')})`}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          onSubmitEditing={submit}
        />
        {errorKey && <AppText color="danger">{t(errorKey)}</AppText>}
        <Button label={t('auth.signUp')} onPress={submit} busy={busy} />
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          <AppText color="muted">{t('auth.haveAccount')}</AppText>
          <Pressable onPress={() => router.back()} accessibilityRole="link">
            <AppText variant="bodyMedium" color="plum">
              {t('auth.signIn')}
            </AppText>
          </Pressable>
        </View>
      </Card>
    </Screen>
  );
}
