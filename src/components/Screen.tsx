import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../theme';
import { AppText } from './AppText';

type Props = { title: string; children?: ReactNode };

// Page wrapper: cream background, padding, heading. Content is centered on wide web screens.
export function Screen({ title, children }: Props) {
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="h1" color="plumDark">
          {title}
        </AppText>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, gap: spacing.md, maxWidth: 960, width: '100%', alignSelf: 'center' },
});
