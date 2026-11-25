import { Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { AppText } from './AppText';

type Props = { label: string; active: boolean; onPress: () => void };

// Small pill button, used by the role switch and the language switcher.
export function Chip({ label, active, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.chip, active && styles.active]}
    >
      <AppText variant="caption" color={active ? 'onPlum' : 'plum'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.plum,
  },
  active: { backgroundColor: colors.plum },
});
