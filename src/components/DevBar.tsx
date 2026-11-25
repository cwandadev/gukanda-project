// TEMPORARY top bar: switch role + language, open the test screen. Delete when real login exists.
// NOTE: it also handles the top safe-area inset, so screens do not.
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18n } from '../lib/i18n';
import { ROLE_HOME, ROLES, useRole } from '../lib/role';
import { colors, spacing } from '../theme';
import { AppText } from './AppText';
import { Chip } from './Chip';
import { LanguageSwitcher } from './LanguageSwitcher';

export function DevBar() {
  const { t } = useI18n();
  const { role, setRole } = useRole();
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.row}>
        <AppText variant="caption" color="muted">
          {t('common.previewAs')}
        </AppText>
        {ROLES.map((r) => (
          <Chip
            key={r}
            label={t(`roles.${r}`)}
            active={r === role}
            onPress={() => {
              setRole(r);
              router.replace(ROLE_HOME[r] as Href);
            }}
          />
        ))}
        <Chip label={t('dev.test')} active={false} onPress={() => router.push('/icon-test' as Href)} />
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
