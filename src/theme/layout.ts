import type { ViewStyle } from 'react-native';
import { colors } from './colors';

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;

// Sizes shared by buttons and inputs.
export const control = { height: 52, heightSm: 40, radius: 14, inputRadius: 12 } as const;

// Width from which the web layout switches to the desktop version.
export const breakpoints = { wide: 900 } as const;

export const shadow = {
  card: '0 2px 12px rgba(107, 63, 110, 0.10)',
  raised: '0 8px 24px rgba(107, 63, 110, 0.18)',
} as const;

// Rounded card used everywhere.
export const cardStyle: ViewStyle = {
  backgroundColor: colors.white,
  borderRadius: radius.lg,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.md,
  boxShadow: shadow.card,
};
