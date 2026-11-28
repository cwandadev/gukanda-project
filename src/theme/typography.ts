// Poppins for headings and larger sizes (20+), Jost for body and small text.
export const fonts = {
  headingMedium: 'Poppins_500Medium',
  headingSemibold: 'Poppins_600SemiBold',
  bodyRegular: 'Jost_400Regular',
  bodyMedium: 'Jost_500Medium',
} as const;

export const fontSizes = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24, xxl: 30 } as const;

// Ready-made text styles. Screens use these through <AppText variant="...">.
export const text = {
  h1: { fontFamily: fonts.headingSemibold, fontSize: fontSizes.xxl, lineHeight: 38 },
  h2: { fontFamily: fonts.headingSemibold, fontSize: fontSizes.xl, lineHeight: 32 },
  h3: { fontFamily: fonts.headingMedium, fontSize: fontSizes.lg, lineHeight: 28 },
  body: { fontFamily: fonts.bodyRegular, fontSize: fontSizes.md, lineHeight: 24 },
  bodyMedium: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, lineHeight: 24 },
  label: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, lineHeight: 20 },
  small: { fontFamily: fonts.bodyRegular, fontSize: fontSizes.sm, lineHeight: 20 },
  caption: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, lineHeight: 16 },
  overline: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.xs,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
} as const;
