import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { AppText } from './AppText';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  busy?: boolean;
};

export function Button({ label, onPress, variant = 'primary', busy = false }: Props) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      style={[styles.base, primary ? styles.primary : styles.secondary, busy && styles.busy]}
    >
      {busy ? (
        <ActivityIndicator color={primary ? colors.onPlum : colors.plum} />
      ) : (
        <AppText variant="bodyMedium" color={primary ? 'onPlum' : 'plum'}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.plum,
  },
  primary: { backgroundColor: colors.plum },
  secondary: { backgroundColor: 'transparent' },
  busy: { opacity: 0.7 },
});
