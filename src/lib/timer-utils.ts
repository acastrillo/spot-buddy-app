/**
 * Timer Utilities
 * Helpers for workout timers, interval timers, and rest timers
 */

import { setCachedItem, getCachedItem, TTL } from './cache-utils';
import { getAudioContext } from '@/types/browser-compat';

export interface TimerState {
  duration: number; // Total duration in seconds
  remaining: number; // Remaining time in seconds
  isRunning: boolean;
  isPaused: boolean;
  startedAt: number | null; // Timestamp when timer started
  pausedAt: number | null; // Timestamp when timer was paused
}

export interface HIITConfig {
  workDuration: number; // Work interval in seconds
  restDuration: number; // Rest interval in seconds
  rounds: number; // Number of rounds
  prepTime: number; // Preparation time before starting (default 10s)
}

export interface HIITState extends TimerState {
  currentRound: number;
  isWorkPhase: boolean; // true = work, false = rest
  config: HIITConfig;
}

/**
 * Format seconds to MM:SS display
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format seconds to human-readable string
 */
export function formatTimeHuman(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) {
    return `${mins}m`;
  }
  return `${mins}m ${secs}s`;
}

/**
 * Calculate progress percentage (0-100)
 */
export function calculateProgress(total: number, remaining: number): number {
  if (total === 0) return 100;
  return Math.round(((total - remaining) / total) * 100);
}

/**
 * Save timer state to localStorage with timestamp
 * Timers have a 24-hour TTL (users might resume workouts the next day)
 */
export function saveTimerState(key: string, state: TimerState | HIITState): void {
  try {
    setCachedItem(key, state);
  } catch (error) {
    console.error('Failed to save timer state:', error);
  }
}

/**
 * Load timer state from localStorage
 * Automatically invalidates if older than 24 hours
 */
export function loadTimerState<T extends TimerState>(key: string): T | null {
  try {
    // Use 24-hour TTL for timer states
    const state = getCachedItem<T>(key, TTL.ONE_DAY);
    return state;
  } catch (error) {
    console.error('Failed to load timer state:', error);
    return null;
  }
}

/**
 * Clear timer state from localStorage
 */
export function clearTimerState(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear timer state:', error);
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Show notification
 */
/**
 * Extended notification options with experimental vibrate API
 */
interface ExtendedNotificationOptions extends NotificationOptions {
  vibrate?: number[];
}

export function showNotification(title: string, options?: NotificationOptions): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  try {
    const extendedOptions: ExtendedNotificationOptions = {
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      vibrate: [200, 100, 200],
      ...options,
    };
    new Notification(title, extendedOptions as NotificationOptions);
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}

/**
 * Generate beep sound using Web Audio API
 */
function generateBeep(): void {
  try {
    const audioContext = getAudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // 800Hz beep
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.error('Failed to generate beep:', error);
  }
}

/**
 * Play audio alert
 */
export function playAlert(audioUrl?: string): void {
  try {
    if (audioUrl) {
      // Use custom audio if provided
      const audio = new Audio(audioUrl);
      audio.volume = 0.5;
      audio.play().catch(error => {
        console.error('Failed to play audio:', error);
        // Fallback to beep
        generateBeep();
      });
    } else {
      // Use generated beep
      generateBeep();
    }
  } catch (error) {
    console.error('Failed to create audio:', error);
  }
}

/**
 * Common rest time presets (in seconds)
 */
export const REST_PRESETS = [
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '1m 30s', value: 90 },
  { label: '2m', value: 120 },
  { label: '3m', value: 180 },
  { label: '5m', value: 300 },
] as const;

/**
 * Common HIIT presets
 */
export const HIIT_PRESETS = [
  {
    name: 'Tabata',
    config: { workDuration: 20, restDuration: 10, rounds: 8, prepTime: 10 },
  },
  {
    name: 'EMOM',
    config: { workDuration: 40, restDuration: 20, rounds: 10, prepTime: 10 },
  },
  {
    name: 'Long Intervals',
    config: { workDuration: 60, restDuration: 30, rounds: 8, prepTime: 10 },
  },
  {
    name: 'Sprint Intervals',
    config: { workDuration: 30, restDuration: 30, rounds: 10, prepTime: 10 },
  },
] as const;
