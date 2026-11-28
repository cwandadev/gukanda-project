// Color tokens. Never write a hex value in a screen.
export const colors = {
  // brand
  plum: '#6b3f6e',
  plumDark: '#4f2c52',
  plumMid: '#8a5a8d',
  plumSoft: '#efe3f0', // selected / hover tint
  plumTint: '#f7f1f8', // very light tint for rows and highlights
  // surfaces
  cream: '#faf6f0', // page background
  creamDark: '#f0e9df',
  white: '#ffffff',
  border: '#e6dde4',
  overlay: 'rgba(43, 34, 48, 0.45)',
  // text
  ink: '#2b2230',
  muted: '#7a6e80',
  onPlum: '#ffffff',
  // status
  danger: '#b3261e',
  dangerSoft: '#fdecea',
  success: '#2e7d32',
  successSoft: '#e6f4ea',
  warning: '#9a5b00',
  warningSoft: '#fff3e0',
} as const;
