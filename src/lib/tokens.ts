/**
 * Design System Tokens
 * 
 * Canonical design values for the application.
 * All components should reference these tokens.
 */

export const tokens = {
  // Spacing scale (in rem)
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
  },

  // Border radius
  radius: {
    none: '0',
    sm: '0.375rem',   // 6px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    '2xl': '1.5rem',  // 24px
    '3xl': '2rem',    // 32px
    full: '9999px',
  },

  // Typography
  fontSize: {
    xs: '0.625rem',   // 10px
    sm: '0.75rem',    // 12px
    base: '0.875rem', // 14px
    lg: '1rem',       // 16px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '2rem',    // 32px
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Animation
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },

  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  // Z-index scale
  zIndex: {
    base: 0,
    dropdown: 50,
    sticky: 100,
    fixed: 200,
    modal: 300,
    tooltip: 400,
  },
} as const;

// Motion presets for framer-motion
export const motion = {
  spring: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 30,
  },
  springGentle: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 25,
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  fadeUp: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
  },
  scale: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
  },
} as const;

// Status colors
export const status = {
  success: 'rgb(34, 197, 94)',
  warning: 'rgb(245, 158, 11)',
  error: 'rgb(239, 68, 68)',
  info: 'rgb(6, 182, 212)',
} as const;
