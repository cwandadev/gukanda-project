// Working hours + time off for ONE practitioner (themselves, or the one an admin picked).
import { View } from 'react-native';
import { spacing } from '../../theme';
import { TimeOff } from './TimeOff';
import { WeeklyHours } from './WeeklyHours';

export function AvailabilityEditor({ practitionerId }: { practitionerId: string }) {
  return (
    <View style={{ gap: spacing.xl }}>
      <WeeklyHours practitionerId={practitionerId} />
      <TimeOff practitionerId={practitionerId} />
    </View>
  );
}
