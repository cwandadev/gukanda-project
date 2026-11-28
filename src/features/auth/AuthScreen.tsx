// Sign in / Create account on one screen. Phone: one column. Wide web: form on the left, brand panel on the right.
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { AppText } from '../../components/AppText';
import { Banner } from '../../components/Banner';
import { Button } from '../../components/Button';
import { Logo } from '../../components/Logo';
import { SegmentedControl } from '../../components/SegmentedControl';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { breakpoints, colors, radius, spacing } from '../../theme';

type Mode = 'signIn' | 'signUp';
const MIN_PASSWORD = 8;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthScreen() {
  const { t } = useI18n();
  const { signIn, signUp } = useAuth();
  const { width } = useWindowDimensions();
  const wide = Platform.OS === 'web' && width >= breakpoints.wide;

  const [mode, setMode] = useState<Mode>('signIn');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (next: string) => {
    setMode(next as Mode);
    setErrorKey(null);
    setNotice(null);
  };

  async function submit() {
    setNotice(null);
    if ((mode === 'signUp' && !fullName.trim()) || !email.trim() || !password) return setErrorKey('auth.error.required');
    if (!EMAIL.test(email.trim())) return setErrorKey('auth.error.emailInvalid');
    if (mode === 'signUp' && password.length < MIN_PASSWORD) return setErrorKey('auth.error.shortPassword');

    setBusy(true);
    setErrorKey(null);
    const result =
      mode === 'signIn' ? await signIn(email.trim(), password) : await signUp(email.trim(), password, fullName.trim());
    setBusy(false);
    if (result.errorKey) setErrorKey(result.errorKey);
    else if (result.needsEmailConfirmation) {
      setMode('signIn');
      setPassword('');
      setNotice('auth.checkEmail');
    }
    // Otherwise we are signed in and the guards in the root layout take us to the right home.
  }

  const signingIn = mode === 'signIn';

  return (
    <View style={[styles.root, wide && { flexDirection: 'row' }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.formScroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Logo />
          <View style={{ gap: spacing.xs }}>
            <AppText variant="h1" color="plumDark">
              {t(signingIn ? 'auth.welcomeBack' : 'auth.createTitle')}
            </AppText>
            <AppText color="muted">{t(signingIn ? 'auth.signInSubtitle' : 'auth.signUpSubtitle')}</AppText>
          </View>

          <SegmentedControl
            value={mode}
            onChange={switchMode}
            options={[
              { value: 'signIn', label: t('auth.signIn') },
              { value: 'signUp', label: t('auth.signUp') },
            ]}
          />

          {notice ? <Banner tone="success">{t(notice)}</Banner> : null}

          <View style={{ gap: spacing.md }}>
            {!signingIn && (
              <TextField label={t('auth.fullName')} value={fullName} onChangeText={setFullName} autoComplete="name" icon="user" />
            )}
            <TextField
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              icon="envelope"
            />
            <TextField
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={signingIn ? 'current-password' : 'new-password'}
              icon="lock"
              hint={signingIn ? undefined : t('auth.passwordHint')}
              onSubmitEditing={submit}
            />
          </View>

          {errorKey ? <Banner tone="error">{t(errorKey)}</Banner> : null}

          <Button label={t(signingIn ? 'auth.signIn' : 'auth.signUp')} onPress={submit} busy={busy} />
        </View>
      </ScrollView>

      {wide && <BrandPanel />}
    </View>
  );
}

// Right-hand panel on wide screens: plum, with soft decorative circles.
function BrandPanel() {
  const { t } = useI18n();
  return (
    <View style={styles.panel}>
      <View style={[styles.circle, { width: 420, height: 420, top: -120, right: -120 }]} />
      <View style={[styles.circle, { width: 300, height: 300, bottom: -90, left: -80, opacity: 0.35 }]} />
      <View style={{ gap: spacing.md, maxWidth: 420 }}>
        <Logo tone="light" size={22} />
        <AppText variant="h1" color="onPlum">
          {t('brand.headline')}
        </AppText>
        <AppText variant="body" color="onPlum" style={{ opacity: 0.85 }}>
          {t('brand.subline')}
        </AppText>
        <AppText variant="overline" color="onPlum" style={{ opacity: 0.7, marginTop: spacing.md }}>
          {t('brand.tagline')}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  formScroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  form: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: spacing.lg },
  panel: {
    flex: 1,
    backgroundColor: colors.plum,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    overflow: 'hidden',
  },
  circle: { position: 'absolute', borderRadius: radius.pill, backgroundColor: colors.plumMid, opacity: 0.45 },
});
