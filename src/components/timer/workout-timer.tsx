"use client";

/**
 * Workout Timer Component
 *
 * Displays a timer configured specifically for a workout.
 * Uses timer params from database (either AI-suggested or manually configured).
 */

import { useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTimerRunner, requestNotificationPermission } from '@/lib/hooks/useTimerRunner';
import type { TimerParams } from '@/timers';

// ============================================================================
// Props
// ============================================================================

export interface WorkoutTimerProps {
  params: TimerParams;
  persistKey?: string;
  onComplete?: () => void;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format milliseconds to MM:SS
 */
function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get segment kind display color
 */
function getSegmentColor(kind: string): string {
  switch (kind) {
    case 'work':
      return 'text-red-500';
    case 'rest':
      return 'text-green-500';
    case 'prep':
      return 'text-blue-500';
    case 'complete':
      return 'text-gray-500';
    default:
      return 'text-gray-400';
  }
}

// ============================================================================
// Component
// ============================================================================

export function WorkoutTimer({ params, persistKey, onComplete }: WorkoutTimerProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Timer hook
  const timer = useTimerRunner({
    params,
    enableSound: soundEnabled,
    enableNotifications: notificationsEnabled,
    onComplete,
    persistKey,
  });

  // Handle notification toggle
  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      const granted = await requestNotificationPermission();
      setNotificationsEnabled(granted);
    } else {
      setNotificationsEnabled(false);
    }
  };

  // Calculate progress percentage
  const progressPercentage = timer.totalDurationMs > 0
    ? Math.min(100, (timer.state.totalElapsedMs / timer.totalDurationMs) * 100)
    : 0;

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Circular Progress Display */}
      <div className="relative flex items-center justify-center">
        <svg className="w-64 h-64 transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="128"
            cy="128"
            r="120"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-200"
          />
          {/* Progress circle */}
          <circle
            cx="128"
            cy="128"
            r="120"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 120}`}
            strokeDashoffset={`${2 * Math.PI * 120 * (1 - progressPercentage / 100)}`}
            className="text-primary transition-all duration-200"
            strokeLinecap="round"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-6xl font-bold ${timer.isCompleted ? 'text-green-500' : ''}`}>
            {formatTime(timer.remainingMs)}
          </div>
          {timer.currentSegment && (
            <div className={`text-lg font-medium mt-2 ${getSegmentColor(timer.currentSegment.kind)}`}>
              {timer.currentSegment.label}
            </div>
          )}
          <div className="text-sm text-muted-foreground mt-1">
            {timer.isCompleted
              ? 'Complete!'
              : `Total: ${formatTime(timer.totalRemainingMs)}`}
          </div>
        </div>
      </div>

      {/* Next Segment Preview */}
      {timer.nextSegment && !timer.isCompleted && (
        <div className="text-center text-sm text-muted-foreground">
          Next: {timer.nextSegment.label} ({formatTime(timer.nextSegment.durationMs)})
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2 justify-center">
        {timer.isRunning ? (
          <Button onClick={timer.pause} size="lg" variant="outline">
            <Pause className="h-5 w-5 mr-2" />
            Pause
          </Button>
        ) : timer.isPaused ? (
          <Button onClick={timer.resume} size="lg">
            <Play className="h-5 w-5 mr-2" />
            Resume
          </Button>
        ) : (
          <Button onClick={timer.start} size="lg">
            <Play className="h-5 w-5 mr-2" />
            Start
          </Button>
        )}

        <Button onClick={timer.reset} size="lg" variant="destructive">
          <RotateCcw className="h-5 w-5 mr-2" />
          Reset
        </Button>
      </div>

      {/* Sound & Notification Controls */}
      <div className="flex gap-2 justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? 'Mute sound' : 'Enable sound'}
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleNotifications}
          title={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
        >
          {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        </Button>
      </div>

      {/* Status Info */}
      <div className="text-center text-sm text-muted-foreground">
        {timer.state.segments.length} segments • {formatTime(timer.totalDurationMs)} total
      </div>
    </div>
  );
}
