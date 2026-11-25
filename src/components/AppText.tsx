import { Text, type TextProps } from 'react-native';
import { colors, text } from '../theme';

type Props = TextProps & {
  variant?: keyof typeof text;
  color?: keyof typeof colors;
};

// All text in the app goes through this, so fonts and colors stay on tokens.
export function AppText({ variant = 'body', color = 'ink', style, ...rest }: Props) {
  return <Text style={[text[variant], { color: colors[color] }, style]} {...rest} />;
}
