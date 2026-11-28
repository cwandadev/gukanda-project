import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { colors, control, spacing } from '../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'light';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: 'md' | 'sm';
  icon?: IconName;
  busy?: boolean;
  disabled?: boolean;
  fullWidth?: boolean; // default: stretches to the container width
};

const LOOK: Record<Variant, { bg: string; border: string; fg: keyof typeof colors }> = {
  primary: { bg: colors.plum, border: colors.plum, fg: 'onPlum' },
  secondary: { bg: colors.white, border: colors.plum, fg: 'plum' },
  ghost: { bg: 'transparent', border: 'transparent', fg: 'plum' },
  danger: { bg: colors.danger, border: colors.danger, fg: 'onPlum' },
  light: { bg: colors.white, border: colors.white, fg: 'plum' }, // for use on a plum background
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  busy = false,
  disabled = false,
  fullWidth = true,
}: Props) {
  const look = LOOK[variant];
  const off = busy || disabled;
  const small = size === 'sm';
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      style={({ pressed }) => [
        styles.base,
        { height: small ? control.heightSm : control.height, backgroundColor: look.bg, borderColor: look.border },
        !fullWidth && styles.auto,
        pressed && styles.pressed,
        disabled && !busy && styles.disabled,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={colors[look.fg]} />
      ) : (
        <View style={styles.row}>
          {icon && <Icon name={icon} size={small ? 18 : 20} color={colors[look.fg]} />}
          <AppText variant={small ? 'label' : 'bodyMedium'} color={look.fg}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'stretch',
    borderRadius: control.radius,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auto: { alignSelf: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.45 },
});
