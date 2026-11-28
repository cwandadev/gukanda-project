import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';
import { AppText } from './AppText';

// Initials in a lilac circle (no photos needed).
export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?';
  return (
    <View style={[styles.circle, { width: size, height: size }]}>
      <AppText variant="label" color="plum">
        {initials}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { backgroundColor: colors.plumSoft, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
