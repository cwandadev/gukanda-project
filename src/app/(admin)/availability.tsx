import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Banner } from '../../components/Banner';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';
import { Select } from '../../components/Select';
import { AvailabilityEditor } from '../../features/availability/AvailabilityEditor';
import { BookingRules } from '../../features/availability/BookingRules';
import { usePractitioners } from '../../features/availability/usePractitioners';
import { useI18n } from '../../lib/i18n';
import { colors, spacing } from '../../theme';

// Admin: pick a practitioner, edit their hours and time off, and set the booking rules.
export default function AdminAvailability() {
  const { t } = useI18n();
  const { list, loading, error } = usePractitioners();
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!selected && list.length > 0) setSelected(list[0].id);
  }, [list, selected]);

  return (
    <Screen title={t('admin.availability')} subtitle={t('admin.availabilitySubtitle')}>
      {loading ? (
        <ActivityIndicator color={colors.plum} />
      ) : error ? (
        <Banner tone="error">{t('admin.error.practitioners')}</Banner>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState icon="group" title={t('admin.noPractitioners')} text={t('admin.noPractitionersText')} />
        </Card>
      ) : (
        <View style={{ gap: spacing.xl }}>
          <Select
            label={t('admin.practitioner')}
            title={t('admin.practitioner')}
            value={selected}
            options={list.map((p) => ({ value: p.id, label: p.full_name || p.id.slice(0, 8) }))}
            onChange={setSelected}
          />
          {selected ? <AvailabilityEditor key={selected} practitionerId={selected} /> : null}
        </View>
      )}

      <BookingRules />
    </Screen>
  );
}
