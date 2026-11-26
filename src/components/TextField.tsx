import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts, fontSizes, radius, spacing } from '../theme';
import { AppText } from './AppText';

type Props = TextInputProps & { label: string };

// Label + input, styled from tokens.
export function TextField({ label, style, ...rest }: Props) {
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="small" color="muted">
        {label}
      </AppText>
      <TextInput placeholderTextColor={colors.muted} style={[styles.input, style]} {...rest} />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.md,
    color: colors.ink,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
});
