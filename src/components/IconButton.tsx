import { Pressable, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';
import { Icon, type IconName } from './Icon';

type Props = { icon: IconName; onPress: () => void; label: string; size?: number; color?: string };

// A round tappable icon. `label` is read by screen readers.
export function IconButton({ icon, onPress, label, size = 40, color = colors.muted }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.base, { width: size, height: size }, pressed && styles.pressed]}
    >
      <Icon name={icon} size={Math.round(size * 0.55)} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  pressed: { backgroundColor: colors.plumSoft },
});
