import { View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { AvailabilityEditor } from '../../features/availability/AvailabilityEditor';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { spacing } from '../../theme';

export default function PractitionerSettings() {
  const { t } = useI18n();
  const { profile, signOut } = useAuth();
  if (!profile) return null;

  return (
    <Screen title={t('practitioner.settings')}>
      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Avatar name={profile.full_name} />
          <View style={{ flex: 1 }}>
            <AppText variant="bodyMedium">{profile.full_name}</AppText>
            <AppText variant="small" color="muted">
              {t(`roles.${profile.role}`)}
            </AppText>
          </View>
        </View>
        <Button variant="secondary" icon="logout" label={t('auth.signOut')} onPress={() => void signOut()} />
      </Card>

      <AvailabilityEditor practitionerId={profile.id} />
    </Screen>
  );
}
