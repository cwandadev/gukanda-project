import { View } from 'react-native';
import { colors, fonts } from '../theme';
import { AppText } from './AppText';

type Props = { tone?: 'dark' | 'light'; size?: number };

// Text wordmark. Replace the body with the real logo file when we have it.
export function Logo({ tone = 'dark', size = 26 }: Props) {
  return (
    <View accessibilityRole="header">
      <AppText
        color={tone === 'dark' ? 'plum' : 'onPlum'}
        style={{ fontFamily: fonts.headingSemibold, fontSize: size, lineHeight: size + 8, letterSpacing: size * 0.12, color: tone === 'dark' ? colors.plum : colors.onPlum }}
      >
        GUKANDA
      </AppText>
    </View>
  );
}
