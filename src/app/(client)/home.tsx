import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { colors, radius, spacing } from '../../theme';

const STEPS = ['home.step1', 'home.step2', 'home.step3'] as const;

export default function Home() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const router = useRouter();
  const first = profile?.full_name.trim().split(/\s+/)[0];

  return (
    <Screen title={first ? t('home.greeting', { name: first }) : t('home.greetingNoName')} subtitle={t('home.subtitle')}>
      <View style={styles.hero}>
        <AppText variant="overline" color="onPlum" style={{ opacity: 0.8 }}>
          {t('home.heroLabel')}
        </AppText>
        <AppText variant="h2" color="onPlum">
          {t('home.heroTitle')}
        </AppText>
        <AppText color="onPlum" style={{ opacity: 0.9 }}>
          {t('home.heroText')}
        </AppText>
        <View style={{ marginTop: spacing.sm }}>
          <Button variant="light" icon="calendarPlus" label={t('home.heroCta')} onPress={() => router.push('/book' as Href)} fullWidth={false} />
        </View>
      </View>

      <Card style={{ gap: spacing.md }}>
        <AppText variant="h3">{t('home.expectTitle')}</AppText>
        {STEPS.map((key, i) => (
          <View key={key} style={styles.step}>
            <View style={styles.num}>
              <AppText variant="label" color="plum">
                {i + 1}
              </AppText>
            </View>
            <AppText style={{ flex: 1 }}>{t(key)}</AppText>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.plum, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  num: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.plumSoft, alignItems: 'center', justifyContent: 'center' },
});
