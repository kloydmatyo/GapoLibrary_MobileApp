// Color palette mirrored from GapoLibrary web app (tailwind.config.ts)
const Colors = {
  primary: {
    50:  '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  // Semantic aliases
  brand:       '#16a34a',
  brandDarker: '#2e7d32', // richer green used on web for gradients/buttons
  brandLight:  '#f0fdf4',
  brandMuted:  '#dcfce7',
  brandDark:   '#15803d',

  // Neutrals
  background:  '#f0fdf4',
  surface:     '#ffffff',
  border:      '#e5e7eb', // slightly softer than before
  textPrimary: '#111827',
  textSecond:  '#6b7280',
  textMuted:   '#9ca3af',

  // Status
  success:     '#16a34a',
  error:       '#dc2626',
  errorBg:     '#fef2f2',
  warning:     '#854d0e',
  warningBg:   '#fef9c3',

  // Shadow helpers (used in elevation styles)
  shadow: '#000',
};

export default Colors;
