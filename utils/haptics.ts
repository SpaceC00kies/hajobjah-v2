
// Utility function for triggering haptic feedback (vibration)

/**
 * Triggers haptic feedback if the Vibration API is supported.
 * @param duration The duration of the vibration in milliseconds.
 */
export const triggerHapticFeedback = (duration: number): void => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    try {
      window.navigator.vibrate(duration);
    } catch (error) {
      // Vibration API can sometimes throw errors on certain devices or if misused,
      // though typically it fails silently if unsupported or permissions are denied.
      console.warn("Haptic feedback trigger failed:", error);
    }
  }
};
