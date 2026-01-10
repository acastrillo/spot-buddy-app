/**
 * Browser compatibility type definitions
 *
 * Provides type-safe access to browser APIs that may have vendor prefixes
 * or different names across browsers.
 */

// Extend Window interface to include vendor-prefixed AudioContext
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

/**
 * Get AudioContext constructor with webkit fallback for Safari
 * Type-safe alternative to: new (window.AudioContext || (window as any).webkitAudioContext)()
 */
export function getAudioContext(): AudioContext {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error('AudioContext is not supported in this browser');
  }

  return new AudioContextConstructor();
}

/**
 * Check if AudioContext is supported in the current browser
 */
export function isAudioContextSupported(): boolean {
  return !!(window.AudioContext || window.webkitAudioContext);
}

export {};
