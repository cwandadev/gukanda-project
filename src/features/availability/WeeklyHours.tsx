// Weekly working hours: a week strip on top, then one card per day with its time ranges.
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Banner } from '../../components/Banner';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { IconButton } from '../../components/IconButton';
import { Select } from '../../components/Select';
import { Toggle } from '../../components/Toggle';
import { useBusinessSettings } from '../../lib/business';
import { useI18n } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { DEFAULT_TIMEZONE, WEEK_ORDER, minutes, timeOptions } from '../../lib/time';
import { colors, radius, spacing } from '../../theme';
import { copyDay, emptyWeek, fromRows, newId, nextRange, toPayload, validateWeek, type Row, type WeekHours } from './hours';

const TIMES = timeOptions(15).map((v) => ({ value: v, label: v }));

export function WeeklyHours({ practitionerId }: { practitionerId: string }) {
  const { t } = useI18n();
  const { settings } = useBusinessSettings();
  const [week, setWeek] = useState<WeekHours>(emptyWeek());
  const [baseline, setBaseline] = useState('[]'); // the saved version, to know if anything changed
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setJustSaved(false);
    supabase
      .from('availability')
      .select('weekday, start_time, end_time')
      .eq('practitioner_id', practitionerId)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setLoadError(true);
        else {
          const loaded = fromRows((data ?? []) as Row[]);
          setWeek(loaded);
          setBaseline(JSON.stringify(toPayload(loaded)));
          setLoadError(false);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [practitionerId]);

  const edit = (next: WeekHours) => {
    setWeek(next);
    setJustSaved(false);
    setSaveError(null);
  };
  const setDay = (wd: number, ranges: WeekHours[number]) => edit({ ...week, [wd]: ranges });

  const problem = validateWeek(week);
  const dirty = JSON.stringify(toPayload(week)) !== baseline;

  async function save() {
    setSaving(true);
    setSaveError(null);
    const { error } = await supabase.rpc('set_weekly_hours', { p_practitioner: practitionerId, p_hours: toPayload(week) });
    setSaving(false);
    if (error) {
      setSaveError(error.message === 'hours_overlap' || error.message === 'hours_invalid' ? `hours.error.${error.message}` : 'hours.error.generic');
      return;
    }
    setBaseline(JSON.stringify(toPayload(week)));
    setJustSaved(true);
  }

  if (loading) return <ActivityIndicator color={colors.plum} />;
  if (loadError) return <Banner tone="error">{t('hours.error.load')}</Banner>;

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="h2">{t('hours.title')}</AppText>
        <AppText color="muted">{t('hours.subtitle', { tz: settings?.timezone ?? DEFAULT_TIMEZONE })}</AppText>
      </View>

      {/* week strip */}
      <View style={styles.strip}>
        {WEEK_ORDER.map((wd) => {
          const open = week[wd].length > 0;
          return (
            <View key={wd} style={styles.stripCell}>
              <AppText variant="caption" color="muted">
                {t(`weekdaysShort.${wd}`)}
              </AppText>
              <View style={[styles.stripDot, { backgroundColor: open ? colors.successSoft : colors.creamDark }]}>
                <Icon name={open ? 'check' : 'minus'} size={16} color={open ? colors.success : colors.muted} />
              </View>
            </View>
          );
        })}
      </View>

      {WEEK_ORDER.map((wd) => {
        const ranges = week[wd];
        const open = ranges.length > 0;
        return (
          <Card key={wd} style={{ gap: spacing.sm + 4 }}>
            <View style={styles.dayHead}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyMedium">{t(`weekdays.${wd}`)}</AppText>
                {!open ? (
                  <AppText variant="small" color="muted">
                    {t('hours.closed')}
                  </AppText>
                ) : null}
              </View>
              <Toggle
                label={t(`weekdays.${wd}`)}
                value={open}
                onValueChange={(on) => setDay(wd, on ? [nextRange([])] : [])}
              />
            </View>

            {ranges.map((r) => {
              const bad = minutes(r.end) <= minutes(r.start);
              return (
                <View key={r.id} style={styles.rangeRow}>
                  <Select
                    compact
                    title={t('hours.from')}
                    value={r.start}
                    options={TIMES}
                    onChange={(v) => setDay(wd, ranges.map((x) => (x.id === r.id ? { ...x, start: v } : x)))}
                  />
                  <AppText color={bad ? 'danger' : 'muted'}>–</AppText>
                  <Select
                    compact
                    title={t('hours.to')}
                    value={r.end}
                    options={TIMES}
                    onChange={(v) => setDay(wd, ranges.map((x) => (x.id === r.id ? { ...x, end: v } : x)))}
                  />
                  <IconButton
                    icon="trash"
                    label={t('common.delete')}
                    onPress={() => setDay(wd, ranges.filter((x) => x.id !== r.id))}
                  />
                </View>
              );
            })}

            {open ? (
              <View style={styles.dayActions}>
                <Button
                  size="sm"
                  variant="ghost"
                  icon="plus"
                  fullWidth={false}
                  label={t('hours.addHours')}
                  onPress={() => setDay(wd, [...ranges, nextRange(ranges)])}
                />
                {wd === 1 ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    fullWidth={false}
                    label={t('hours.copyMonday')}
                    onPress={() => edit(copyDay(week, 1, [2, 3, 4, 5]))}
                  />
                ) : null}
              </View>
            ) : null}
          </Card>
        );
      })}

      {problem ? <Banner tone="error">{t(`hours.error.${problem}`)}</Banner> : null}
      {saveError ? <Banner tone="error">{t(saveError)}</Banner> : null}
      {justSaved ? <Banner tone="success">{t('hours.saved')}</Banner> : null}
      {dirty && !problem && !saveError ? <Banner tone="info">{t('hours.unsaved')}</Banner> : null}

      <Button label={t('hours.save')} onPress={save} busy={saving} disabled={!dirty || !!problem} />
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: spacing.xs },
  stripCell: { flex: 1, alignItems: 'center', gap: spacing.xs },
  stripDot: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dayActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
