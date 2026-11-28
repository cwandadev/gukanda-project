import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useI18n } from '../lib/i18n';
import { WEEK_ORDER, formatDateStr, monthGrid } from '../lib/time';
import { colors, radius, spacing } from '../theme';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

type Props = {
  value: string | null; // 'YYYY-MM-DD'
  onChange: (date: string) => void;
  min?: string; // days before this are disabled
  today?: string; // marks today with a ring
};

// Month grid, Monday first. Works the same on phone and web.
export function CalendarMonth({ value, onChange, min, today }: Props) {
  const { t, lang } = useI18n();
  const start = value ?? min ?? today ?? new Date().toISOString().slice(0, 10);
  const [year, setYear] = useState(Number(start.slice(0, 4)));
  const [month, setMonth] = useState(Number(start.slice(5, 7)));

  const move = (delta: number) => {
    const d = new Date(Date.UTC(year, month - 1 + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth() + 1);
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.head}>
        <IconButton icon="chevronLeft" label={t('common.previous')} onPress={() => move(-1)} />
        <AppText variant="h3" style={{ textTransform: 'capitalize' }}>
          {formatDateStr(`${year}-${String(month).padStart(2, '0')}-01`, lang, { month: 'long', year: 'numeric' })}
        </AppText>
        <IconButton icon="chevronRight" label={t('common.next')} onPress={() => move(1)} />
      </View>
      <View style={styles.row}>
        {WEEK_ORDER.map((wd) => (
          <View key={wd} style={styles.cell}>
            <AppText variant="caption" color="muted">
              {t(`weekdaysShort.${wd}`)}
            </AppText>
          </View>
        ))}
      </View>
      {monthGrid(year, month).map((week, i) => (
        <View key={i} style={styles.row}>
          {week.map((day, j) => {
            if (!day) return <View key={j} style={styles.cell} />;
            const disabled = !!min && day < min;
            const selected = day === value;
            return (
              <View key={j} style={styles.cell}>
                <Pressable
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={formatDateStr(day, lang, { weekday: 'long', day: 'numeric', month: 'long' })}
                  accessibilityState={{ selected, disabled }}
                  onPress={() => onChange(day)}
                  style={[styles.day, day === today && styles.today, selected && styles.selected, disabled && { opacity: 0.3 }]}
                >
                  <AppText variant="label" color={selected ? 'onPlum' : 'ink'}>
                    {Number(day.slice(8, 10))}
                  </AppText>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  day: { width: 38, height: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1.5, borderColor: colors.plum },
  selected: { backgroundColor: colors.plum, borderColor: colors.plum },
});
