import { Pressable, StyleSheet, View } from 'react-native';
import { colors, control, radius, spacing } from '../theme';
import { AppText } from './AppText';

type Props = {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
};

// Two or three equal tabs in a grey track; the active one is white (like "Sign in | Create account").
export function SegmentedControl({ options, value, onChange }: Props) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.tab, active && styles.active]}
          >
            <AppText variant="label" color={active ? 'plum' : 'muted'}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.creamDark,
    borderRadius: control.radius,
    padding: 4,
    gap: 4,
  },
  tab: { flex: 1, height: control.heightSm, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, paddingHorizontal: spacing.sm },
  active: { backgroundColor: colors.white, boxShadow: '0 1px 4px rgba(107, 63, 110, 0.15)' },
});
