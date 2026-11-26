// Shown when someone is signed in but their profile cannot be loaded (no network, or a missing row).
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { spacing } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { Screen } from './Screen';

export function ProfileProblem() {
  const { t } = useI18n();
  const { retryProfile, signOut } = useAuth();
  return (
    <Screen title={t('auth.profileErrorTitle')}>
      <Card style={{ gap: spacing.md }}>
        <AppText>{t('auth.profileError')}</AppText>
        <Button label={t('auth.retry')} onPress={retryProfile} />
        <Button label={t('auth.signOut')} variant="secondary" onPress={() => void signOut()} />
      </Card>
    </Screen>
  );
}
