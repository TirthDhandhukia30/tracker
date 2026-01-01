/**
 * Haptic feedback utilities for tactile responses.
 * Uses the Vibration API where available.
 */

type HapticPattern = number | number[];

const vibrate = (pattern: HapticPattern): boolean => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    return navigator.vibrate(pattern);
  }
  return false;
};

export const haptics = {
  /** Light tap - for toggles, selections */
  light: () => vibrate(10),
  
  /** Medium tap - for confirmations */
  medium: () => vibrate(20),
  
  /** Heavy tap - for important actions */
  heavy: () => vibrate(30),
  
  /** Success pattern - for completed actions */
  success: () => vibrate([10, 50, 20]),
  
  /** Error pattern - for failed actions */
  error: () => vibrate([50, 30, 50]),
  
  /** Warning pattern - for destructive action confirmations */
  warning: () => vibrate([30, 20, 30]),
  
  /** Selection changed */
  selection: () => vibrate(5),
} as const;

/**
 * Hook-friendly wrapper that returns haptic functions
 * that gracefully degrade on unsupported platforms
 */
export function createHapticFeedback() {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  
  return {
    isSupported,
    ...haptics,
  };
}
