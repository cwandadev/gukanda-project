import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Props = { icon: IconName; title: string; text?: string; action?: ReactNode };

export function EmptyState({ icon, title, text, action }: Props) {
  return (
    <View style={styles.box}>
      <View style={styles.circle}>
        <Icon name={icon} size={28} color={colors.plum} />
      </View>
      <AppText variant="h3" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      {text ? (
        <AppText color="muted" style={{ textAlign: 'center' }}>
          {text}
        </AppText>
      ) : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', gap: spacing.sm + 2, padding: spacing.lg },
  circle: { width: 64, height: 64, borderRadius: radius.pill, backgroundColor: colors.plumSoft, alignItems: 'center', justifyContent: 'center' },
});
