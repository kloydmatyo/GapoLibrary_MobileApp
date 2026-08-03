// Warm library palette — off-white base, ink text, teal accent, red for critical only
const Colors = {
  // Surfaces
  background: '#F7F5F0',
  surface: '#FFFFFF',
  surfaceMuted: '#EFEBE4',
  border: '#E7E2D9',

  // Typography
  textPrimary: '#1C1917',
  textSecond: '#57534E',
  textMuted: '#A8A29E',

  // Brand / accent (knowledge — deep teal)
  accent: '#3FA36C',
  accentMuted: '#3FA36C1A',
  accentDark: '#0a5a5a',

  // Semantic aliases (backward-compatible)
  brand: '#3FA36C',
  brandDarker: '#0a5a5a',
  brandLight: '#3FA36C1A',
  brandMuted: '#3FA36C1A',
  brandDark: '#0a5a5a',

  // Status — red reserved for overdue / critical
  error: '#B91C1C',
  errorBg: '#FEF2F2',
  statusReturned: '#78716C',
  statusReturnedBg: '#F5F5F4',

  // Legacy keys (mapped to new palette; avoid green/orange in UI)
  success: '#3FA36C',
  warning: '#57534E',
  warningBg: '#EFEBE4',

  primary: {
    50: '#3FA36C1A',
    100: '#CCE5E5',
    200: '#99CCCC',
    300: '#66B2B2',
    400: '#339999',
    500: '#3FA36C',
    600: '#0a5a5a',
    700: '#084444',
    800: '#063333',
    900: '#042222',
  },

  shadow: '#1C1917',
};

export const Radius = {
  container: 8,
  inner: 4,
} as const;

export default Colors;
