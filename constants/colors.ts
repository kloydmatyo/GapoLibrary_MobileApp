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
  accent: '#0D6E6E',
  accentMuted: '#E6F2F2',
  accentDark: '#0A5555',

  // Semantic aliases (backward-compatible)
  brand: '#0D6E6E',
  brandDarker: '#0A5555',
  brandLight: '#E6F2F2',
  brandMuted: '#E6F2F2',
  brandDark: '#0A5555',

  // Status — red reserved for overdue / critical
  error: '#B91C1C',
  errorBg: '#FEF2F2',
  statusReturned: '#78716C',
  statusReturnedBg: '#F5F5F4',

  // Legacy keys (mapped to new palette; avoid green/orange in UI)
  success: '#0D6E6E',
  warning: '#57534E',
  warningBg: '#EFEBE4',

  primary: {
    50: '#E6F2F2',
    100: '#CCE5E5',
    200: '#99CCCC',
    300: '#66B2B2',
    400: '#339999',
    500: '#0D6E6E',
    600: '#0A5555',
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
