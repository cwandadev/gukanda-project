import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../theme';
import { AppText } from './AppText';

type Props = { title: string; subtitle?: string; right?: ReactNode; children?: ReactNode };

// Page wrapper: cream background, padding, heading. Content is centered on wide web screens.
export function Screen({ title, subtitle, right, children }: Props) {
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <AppText variant="h1" color="plumDark">
              {title}
            </AppText>
            {subtitle ? <AppText color="muted">{subtitle}</AppText> : null}
          </View>
          {right}
        </View>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, gap: spacing.lg, maxWidth: 960, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
});
