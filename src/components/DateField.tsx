import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useI18n } from '../lib/i18n';
import { formatDateStr } from '../lib/time';
import { colors, control, radius, shadow, spacing } from '../theme';
import { AppText } from './AppText';
import { CalendarMonth } from './CalendarMonth';
import { Icon } from './Icon';

type Props = {
  label: string;
  value: string | null;
  onChange: (date: string) => void;
  min?: string;
  today?: string;
};

// A field that shows a date and opens a calendar. (The native date-picker libraries do not work on web.)
export function DateField({ label, value, onChange, min, today }: Props) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ gap: spacing.xs, flex: 1 }}>
      <AppText variant="label">{label}</AppText>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => setOpen(true)} style={styles.box}>
        <Icon name="calendar" size={20} color={colors.muted} />
        <AppText color={value ? 'ink' : 'muted'} style={{ flex: 1 }}>
          {value ? formatDateStr(value, lang, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : t('timeOff.pickDate')}
        </AppText>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <CalendarMonth
              value={value}
              min={min}
              today={today}
              onChange={(d) => {
                onChange(d);
                setOpen(false);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: control.height,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: control.inputRadius,
  },
  overlay: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  sheet: { width: '100%', maxWidth: 360, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, boxShadow: shadow.raised },
});
