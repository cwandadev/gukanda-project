import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Tone = 'info' | 'success' | 'warning' | 'error';

const LOOK: Record<Tone, { bg: string; fg: keyof typeof colors; icon: IconName }> = {
  info: { bg: colors.plumTint, fg: 'plum', icon: 'info' },
  success: { bg: colors.successSoft, fg: 'success', icon: 'checkCircle' },
  warning: { bg: colors.warningSoft, fg: 'warning', icon: 'warning' },
  error: { bg: colors.dangerSoft, fg: 'danger', icon: 'warning' },
};

type Props = { tone?: Tone; children: string };

// A short message strip (error, success, notice).
export function Banner({ tone = 'info', children }: Props) {
  const look = LOOK[tone];
  return (
    <View style={[styles.box, { backgroundColor: look.bg }]} accessibilityRole={tone === 'error' ? 'alert' : undefined}>
      <Icon name={look.icon} size={20} color={colors[look.fg]} />
      <AppText variant="small" color={look.fg} style={{ flex: 1 }}>
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md - 2, borderRadius: radius.md },
});
