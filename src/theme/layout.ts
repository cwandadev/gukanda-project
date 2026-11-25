import type { ViewStyle } from 'react-native';
import { colors } from './colors';

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;

// Rounded card used everywhere.
export const cardStyle: ViewStyle = {
  backgroundColor: colors.white,
  borderRadius: radius.lg,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.md,
  boxShadow: '0 2px 12px rgba(107, 63, 110, 0.10)',
};
