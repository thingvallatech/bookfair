// Haptic feedback utility using the Vibration API
// No-op on desktop or unsupported browsers
// Respects the audio toggle (audioEnabled in localStorage)

type HapticPattern = 'tap' | 'success' | 'error' | 'heavy' | 'discovery';

const patterns: Record<HapticPattern, number | number[]> = {
  tap: 10,
  success: [10, 50, 10],
  error: [50, 30, 50],
  heavy: 40,
  discovery: [10, 30, 10, 30, 50],
};

function isEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof navigator === 'undefined') return false;
  if (!('vibrate' in navigator)) return false;
  return localStorage.getItem('audioEnabled') === 'true';
}

export function haptic(pattern: HapticPattern): void {
  if (!isEnabled()) return;
  navigator.vibrate(patterns[pattern]);
}
