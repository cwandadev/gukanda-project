import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useI18n } from '../lib/i18n';
import { colors, control, fonts, fontSizes, spacing } from '../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { IconButton } from './IconButton';

type Props = TextInputProps & {
  label: string;
  error?: string | null;
  hint?: string;
  icon?: IconName;
};

// Label above, outlined box, plum focus ring, inline error. Passwords get a show/hide button.
export function TextField({ label, error, hint, icon, style, onFocus, onBlur, secureTextEntry, ...rest }: Props) {
  const { t } = useI18n();
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);

  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="label">{label}</AppText>
      <View style={[styles.box, focused && styles.focused, !!error && styles.errorBox]}>
        {icon && <Icon name={icon} size={20} color={colors.muted} />}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          secureTextEntry={!!secureTextEntry && !shown}
          style={[styles.input, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {secureTextEntry ? (
          <IconButton
            icon={shown ? 'hide' : 'show'}
            label={t(shown ? 'auth.hidePassword' : 'auth.showPassword')}
            onPress={() => setShown((v) => !v)}
            size={36}
          />
        ) : null}
      </View>
      {error ? (
        <AppText variant="small" color="danger">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="small" color="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: control.height,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: control.inputRadius,
  },
  focused: { borderColor: colors.plum },
  errorBox: { borderColor: colors.danger },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.md,
    color: colors.ink,
    outlineWidth: 0, // web: we draw our own focus ring on the box
  },
});
