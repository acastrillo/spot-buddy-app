"use client";

/**
 * useTimerRunner Hook
 *
 * React hook for running timers in the browser.
 * Uses browser APIs (localStorage, Audio, Notification) - web-specific.
 * For React Native, create a parallel implementation with native APIs.
 */

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  type TimerParams,
  type TimerRuntimeState,
  type TimerSegment,
  createInitialTimerState,
  startTimer,
  pauseTimer,
  resumeTimer,
  resetTimer,
  tickTimer,
  computeTotalDurationMs,
  getCurrentSegment,
  getNextSegment,
  isLastSegment as checkIsLastSegment,
  getRemainingInSegmentMs,
  getTotalRemainingMs,
} from '@/timers';

// ============================================================================
// Browser API Utilities
// ============================================================================

/**
 * Play an alert sound using Web Audio API
 */
function playAlertSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // Hz
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.warn('Failed to play alert sound:', error);
  }
}

/**
 * Play countdown beep with different frequency for each second
 * @param secondsRemaining - 3, 2, or 1 seconds remaining
 */
function playCountdownBeep(secondsRemaining: number): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different frequencies for countdown progression
    const frequencies: Record<number, number> = {
      3: 600,  // Low tone
      2: 700,  // Medium tone
      1: 800,  // High tone
    };

    oscillator.frequency.value = frequencies[secondsRemaining] || 800;
    oscillator.type = 'sine';

    // Shorter beep duration for countdown (300ms vs 500ms)
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.3
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.warn('Failed to play countdown beep:', error);
  }
}

/**
 * Show browser notification
 */
function showNotification(title: string, body: string): void {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icon.png',
        badge: '/badge.png',
      });
    }
  } catch (error) {
    console.warn('Failed to show notification:', error);
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  } catch (error) {
    console.warn('Failed to request notification permission:', error);
    return false;
  }
}

/**
 * Load timer state from localStorage
 */
function loadTimerState(key: string): TimerRuntimeState | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    return parsed as TimerRuntimeState;
  } catch (error) {
    console.warn('Failed to load timer state:', error);
    return null;
  }
}

/**
 * Save timer state to localStorage
 */
function saveTimerState(key: string, state: TimerRuntimeState): void {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save timer state:', error);
  }
}

/**
 * Clear timer state from localStorage
 */
function clearTimerState(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to clear timer state:', error);
  }
}

// ============================================================================
// Hook Options & Return Type
// ============================================================================

export interface UseTimerRunnerOptions {
  params: TimerParams;
  autoStart?: boolean;
  onSegmentChange?: (segment: TimerSegment) => void;
  onComplete?: () => void;
  enableSound?: boolean;
  enableNotifications?: boolean;
  persistKey?: string; // localStorage key for persistence
}

export interface UseTimerRunnerReturn {
  state: TimerRuntimeState;
  currentSegment: TimerSegment | null;
  nextSegment: TimerSegment | null;
  remainingMs: number;
  totalRemainingMs: number;
  totalDurationMs: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  isLastSegment: boolean;
}

// ============================================================================
// useTimerRunner Hook
// ============================================================================

export function useTimerRunner(options: UseTimerRunnerOptions): UseTimerRunnerReturn {
  const {
    params,
    autoStart = false,
    onSegmentChange,
    onComplete,
    enableSound = false,
    enableNotifications = false,
    persistKey,
  } = options;

  // Initialize state (try to restore from localStorage if persistKey provided)
  const [state, setState] = useState<TimerRuntimeState>(() => {
    if (persistKey) {
      const saved = loadTimerState(persistKey);
      if (saved && saved.status !== 'COMPLETED') {
        return saved;
      }
    }
    return createInitialTimerState(params);
  });

  // Track previous segment for change detection
  const prevSegmentIndexRef = useRef<number>(state.currentSegmentIndex);
  const prevStatusRef = useRef<string>(state.status);

  // Re-initialize when params change
  useEffect(() => {
    setState(createInitialTimerState(params));
    prevSegmentIndexRef.current = 0;
  }, [params]);

  // Auto-start if requested
  useEffect(() => {
    if (autoStart && state.status === 'IDLE') {
      setState((prev) => startTimer(prev, Date.now()));
    }
  }, [autoStart, state.status]);

  // Tick loop (200ms interval when running)
  useEffect(() => {
    if (state.status !== 'RUNNING') return;

    const intervalMs = 200;
    const intervalId = setInterval(() => {
      setState((prev) => tickTimer(prev, Date.now()));
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [state.status]);

  // Persistence (save to localStorage when state changes)
  useEffect(() => {
    if (persistKey) {
      if (state.status === 'COMPLETED') {
        clearTimerState(persistKey);
      } else {
        saveTimerState(persistKey, state);
      }
    }
  }, [state, persistKey]);

  // Countdown beep detection (3-2-1 seconds)
  const prevRemainingSecondsRef = useRef<number>(0);

  useEffect(() => {
    // Only trigger countdown beeps if timer is running
    if (state.status !== 'RUNNING') {
      return;
    }

    const totalRemainingMs = getTotalRemainingMs(state);
    const remainingSeconds = Math.floor(totalRemainingMs / 1000);
    const prevRemaining = prevRemainingSecondsRef.current;

    // Beep when crossing countdown thresholds (only when counting down)
    if (enableSound && prevRemaining > remainingSeconds) {
      if (prevRemaining > 3 && remainingSeconds === 3) {
        playCountdownBeep(3); // Low tone
      } else if (prevRemaining > 2 && remainingSeconds === 2) {
        playCountdownBeep(2); // Medium tone
      } else if (prevRemaining > 1 && remainingSeconds === 1) {
        playCountdownBeep(1); // High tone
      }
    }

    prevRemainingSecondsRef.current = remainingSeconds;
  }, [state, enableSound]);

  // Segment change detection
  useEffect(() => {
    const currentSegmentIndex = state.currentSegmentIndex;
    const currentStatus = state.status;

    // Detect segment change
    if (currentSegmentIndex !== prevSegmentIndexRef.current) {
      const segment = state.segments[currentSegmentIndex];

      if (segment) {
        // Call callback
        if (onSegmentChange) {
          onSegmentChange(segment);
        }

        // Play sound if enabled
        if (enableSound) {
          playAlertSound();
        }

        // Show notification if enabled
        if (enableNotifications) {
          showNotification(
            'Timer',
            `${segment.label} - ${Math.round(segment.durationMs / 1000)}s`
          );
        }
      }

      prevSegmentIndexRef.current = currentSegmentIndex;
    }

    // Detect completion
    if (currentStatus === 'COMPLETED' && prevStatusRef.current !== 'COMPLETED') {
      if (onComplete) {
        onComplete();
      }

      if (enableSound) {
        // Play 3 beeps for completion
        setTimeout(() => playAlertSound(), 0);
        setTimeout(() => playAlertSound(), 300);
        setTimeout(() => playAlertSound(), 600);
      }

      if (enableNotifications) {
        showNotification('Timer Complete', 'Workout timer finished!');
      }
    }

    prevStatusRef.current = currentStatus;
  }, [
    state.currentSegmentIndex,
    state.status,
    state.segments,
    onSegmentChange,
    onComplete,
    enableSound,
    enableNotifications,
  ]);

  // Control functions
  const handleStart = useCallback(() => {
    setState((prev) => startTimer(prev, Date.now()));
  }, []);

  const handlePause = useCallback(() => {
    setState((prev) => pauseTimer(prev, Date.now()));
  }, []);

  const handleResume = useCallback(() => {
    setState((prev) => resumeTimer(prev, Date.now()));
  }, []);

  const handleReset = useCallback(() => {
    setState((prev) => {
      const newState = resetTimer(prev);
      prevSegmentIndexRef.current = 0;
      prevStatusRef.current = 'IDLE';
      return newState;
    });
  }, []);

  // Computed values
  const totalDurationMs = useMemo(
    () => computeTotalDurationMs(state.segments),
    [state.segments]
  );

  const currentSegment = useMemo(
    () => getCurrentSegment(state),
    [state]
  );

  const nextSegment = useMemo(
    () => getNextSegment(state),
    [state]
  );

  const isLast = useMemo(
    () => checkIsLastSegment(state),
    [state]
  );

  const remainingMs = useMemo(
    () => getRemainingInSegmentMs(state),
    [state]
  );

  const totalRemaining = useMemo(
    () => getTotalRemainingMs(state),
    [state]
  );

  return {
    state,
    currentSegment,
    nextSegment,
    remainingMs,
    totalRemainingMs: totalRemaining,
    totalDurationMs,
    start: handleStart,
    pause: handlePause,
    resume: handleResume,
    reset: handleReset,
    isRunning: state.status === 'RUNNING',
    isPaused: state.status === 'PAUSED',
    isCompleted: state.status === 'COMPLETED',
    isLastSegment: isLast,
  };
}
