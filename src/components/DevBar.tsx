// TEMPORARY top bar: who is signed in, Test screen, sign out, language. Remove before release
// (move the language switcher and sign out into Profile / Settings).
// NOTE: it also handles the top safe-area inset, so screens do not.
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { colors, spacing } from '../theme';
import { AppText } from './AppText';
import { Chip } from './Chip';
import { LanguageSwitcher } from './LanguageSwitcher';

export function DevBar() {
  const { t } = useI18n();
  const { profile, signOut } = useAuth();
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.row}>
        {profile && (
          <AppText variant="caption" color="muted">
            {t('dev.signedInAs')} {t(`roles.${profile.role}`)}
          </AppText>
        )}
        {profile && __DEV__ && (
          <Chip label={t('dev.test')} active={false} onPress={() => router.push('/icon-test' as Href)} />
        )}
        {profile && <Chip label={t('auth.signOut')} active={false} onPress={() => void signOut()} />}
        <View style={{ marginLeft: 'auto' }}>
          <LanguageSwitcher />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.creamDark },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
