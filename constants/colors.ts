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
  brand:       '#16a34a', // primary-600 — main brand color (buttons, headers, icons)
  brandLight:  '#f0fdf4', // primary-50  — light tinted backgrounds
  brandMuted:  '#dcfce7', // primary-100 — subtle tints (badges, icon wraps)
  brandDark:   '#15803d', // primary-700 — pressed states / dark accents

  // Neutrals (unchanged)
  background:  '#f0fdf4', // page background (was #f0f4ff)
  surface:     '#ffffff',
  border:      '#d1d5db',
  textPrimary: '#111827',
  textSecond:  '#6b7280',
  textMuted:   '#9ca3af',

  // Status
  success:     '#16a34a',
  error:       '#dc2626',
  errorBg:     '#fef2f2',
  warning:     '#854d0e',
  warningBg:   '#fef9c3',
};

export default Colors;
