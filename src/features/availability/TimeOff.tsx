// Time off: upcoming blocks of days/hours when the practitioner cannot be booked.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Banner } from '../../components/Banner';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DateField } from '../../components/DateField';
import { EmptyState } from '../../components/EmptyState';
import { IconButton } from '../../components/IconButton';
import { Select } from '../../components/Select';
import { TextField } from '../../components/TextField';
import { Toggle } from '../../components/Toggle';
import { useBusinessSettings } from '../../lib/business';
import { useI18n } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { DEFAULT_TIMEZONE, addDays, describeRange, timeOptions, todayIn } from '../../lib/time';
import { colors, spacing } from '../../theme';

type Row = { id: string; starts_at: string; ends_at: string; reason: string | null };
const TIMES = timeOptions(15).map((v) => ({ value: v, label: v }));

export function TimeOff({ practitionerId }: { practitionerId: string }) {
  const { t, lang } = useI18n();
  const { settings } = useBusinessSettings();
  const tz = settings?.timezone ?? DEFAULT_TIMEZONE;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('time_off')
      .select('id, starts_at, ends_at, reason')
      .eq('practitioner_id', practitionerId)
      .gte('ends_at', new Date().toISOString())
      .order('starts_at');
    if (error) setLoadError(true);
    else {
      setRows((data ?? []) as Row[]);
      setLoadError(false);
    }
    setLoading(false);
  }, [practitionerId]);

  useEffect(() => {
    setLoading(true);
    setAdding(false);
    void load();
  }, [load]);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(false);
    const { error } = await supabase.from('time_off').delete().eq('id', toDelete.id);
    setDeleting(false);
    if (error) return setDeleteError(true);
    setToDelete(null);
    await load();
  }

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.head}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <AppText variant="h2">{t('timeOff.title')}</AppText>
          <AppText color="muted">{t('timeOff.subtitle')}</AppText>
        </View>
      </View>

      {!adding && <Button variant="secondary" icon="plus" label={t('timeOff.add')} onPress={() => setAdding(true)} />}

      {adding && (
        <AddTimeOff
          practitionerId={practitionerId}
          tz={tz}
          onCancel={() => setAdding(false)}
          onSaved={async () => {
            setAdding(false);
            await load();
          }}
        />
      )}

      {loading ? (
        <ActivityIndicator color={colors.plum} />
      ) : loadError ? (
        <Banner tone="error">{t('timeOff.error.load')}</Banner>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState icon="calendarCheck" title={t('timeOff.empty')} />
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {rows.map((r) => (
            <Card key={r.id} style={styles.row}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="bodyMedium">{describeRange(r.starts_at, r.ends_at, lang, tz)}</AppText>
                {r.reason ? (
                  <AppText variant="small" color="muted">
                    {r.reason}
                  </AppText>
                ) : null}
              </View>
              <IconButton icon="trash" label={t('common.delete')} onPress={() => setToDelete(r)} />
            </Card>
          ))}
        </View>
      )}

      <ConfirmDialog
        visible={!!toDelete}
        danger
        busy={deleting}
        title={t('timeOff.deleteTitle')}
        message={deleteError ? t('timeOff.error.generic') : t('timeOff.deleteText')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={confirmDelete}
        onCancel={() => {
          setToDelete(null);
          setDeleteError(false);
        }}
      />
    </View>
  );
}

function AddTimeOff({
  practitionerId,
  tz,
  onSaved,
  onCancel,
}: {
  practitionerId: string;
  tz: string;
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const today = todayIn(tz);
  const [startDate, setStartDate] = useState<string | null>(today);
  const [endDate, setEndDate] = useState<string | null>(today);
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  async function save() {
    if (!startDate || !endDate) return setErrorKey('timeOff.error.invalid');
    // The app sends France date-times; the database converts them to UTC (summer/winter time included).
    const startLocal = `${startDate}T${allDay ? '00:00' : startTime}:00`;
    const endLocal = allDay ? `${addDays(endDate, 1)}T00:00:00` : `${endDate}T${endTime}:00`;
    if (endLocal <= startLocal) return setErrorKey('timeOff.error.invalid');

    setBusy(true);
    setErrorKey(null);
    const { error } = await supabase.rpc('add_time_off', {
      p_practitioner: practitionerId,
      p_start_local: startLocal,
      p_end_local: endLocal,
      p_reason: reason.trim() || null,
    });
    setBusy(false);
    if (error) return setErrorKey(error.message === 'time_off_invalid' ? 'timeOff.error.invalid' : 'timeOff.error.generic');
    await onSaved();
  }

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={styles.dates}>
        <DateField label={t('timeOff.start')} value={startDate} today={today} min={today} onChange={(d) => {
          setStartDate(d);
          if (!endDate || endDate < d) setEndDate(d);
        }} />
        <DateField label={t('timeOff.end')} value={endDate} today={today} min={startDate ?? today} onChange={setEndDate} />
      </View>

      <View style={styles.toggleRow}>
        <AppText style={{ flex: 1 }}>{t('timeOff.allDay')}</AppText>
        <Toggle label={t('timeOff.allDay')} value={allDay} onValueChange={setAllDay} />
      </View>

      {!allDay && (
        <View style={styles.dates}>
          <Select label={t('timeOff.startTime')} title={t('timeOff.startTime')} value={startTime} options={TIMES} onChange={setStartTime} compact />
          <Select label={t('timeOff.endTime')} title={t('timeOff.endTime')} value={endTime} options={TIMES} onChange={setEndTime} compact />
        </View>
      )}

      <TextField label={t('timeOff.reason')} value={reason} onChangeText={setReason} maxLength={200} />

      {errorKey ? <Banner tone="error">{t(errorKey)}</Banner> : null}

      <Button label={t('timeOff.save')} onPress={save} busy={busy} />
      <Button label={t('common.cancel')} variant="ghost" onPress={onCancel} />
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dates: { flexDirection: 'row', gap: spacing.md },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
