"use client";

/**
 * Interval Timer Component (Refactored)
 *
 * Simple configurable countdown timer with circular progress display.
 * Migrated to use the new useTimerRunner hook with a single AMRAP segment.
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Play,
  Pause,
  RotateCcw,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useTimerRunner, requestNotificationPermission } from '@/lib/hooks/useTimerRunner';
import type { AMRAPParams } from '@/timers';
import { formatTime } from '@/lib/timer-utils';

// ============================================================================
// Props
// ============================================================================

interface IntervalTimerProps {
  initialDuration?: number; // Initial duration in seconds
  onComplete?: () => void;
  autoStart?: boolean;
  showControls?: boolean;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function IntervalTimer({
  initialDuration = 60,
  onComplete,
  autoStart = false,
  showControls = true,
  className = '',
}: IntervalTimerProps) {
  const [duration, setDuration] = useState(initialDuration);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Create timer params
  const timerParams = useMemo<AMRAPParams>(
    () => ({
      kind: 'AMRAP',
      durationSeconds: duration,
    }),
    [duration]
  );

  // Timer hook
  const timer = useTimerRunner({
    params: timerParams,
    autoStart,
    enableSound: soundEnabled,
    enableNotifications: notificationsEnabled,
    onComplete,
    persistKey: 'interval-timer-state',
  });

  // Handle notification toggle
  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      const granted = await requestNotificationPermission();
      setNotificationsEnabled(granted);
    } else {
      setNotificationsEnabled(false);
    }
  };

  // Handle duration change
  const handleDurationChange = (newDuration: number) => {
    if (newDuration > 0 && newDuration <= 3600) { // Max 1 hour
      setDuration(newDuration);
      // Reset timer with new duration
      setTimeout(() => {
        timer.reset();
      }, 0);
    }
  };

  // Calculate circular progress
  const progress = timer.totalDurationMs > 0
    ? (timer.state.totalElapsedMs / timer.totalDurationMs) * 100
    : 0;
  const circumference = 2 * Math.PI * 120; // radius of 120
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-6">
          {/* Circular Progress */}
          <div className="relative w-64 h-64">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-surface"
              />
              {/* Progress circle */}
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="text-primary transition-all duration-300"
              />
            </svg>
            {/* Time display */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl font-bold text-text-primary tabular-nums">
                  {formatTime(Math.ceil(timer.remainingMs / 1000))}
                </div>
                <div className="text-sm text-text-secondary mt-2">
                  {timer.isRunning
                    ? 'Running'
                    : timer.isPaused
                    ? 'Paused'
                    : timer.isCompleted
                    ? 'Complete'
                    : 'Ready'}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          {showControls && (
            <>
              <div className="flex items-center space-x-3">
                {timer.isRunning ? (
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={timer.pause}
                    className="w-24"
                  >
                    <Pause className="h-5 w-5 mr-2" />
                    Pause
                  </Button>
                ) : timer.isPaused ? (
                  <Button
                    size="lg"
                    onClick={timer.resume}
                    className="w-24"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Resume
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={timer.start}
                    disabled={timer.isCompleted}
                    className="w-24"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Start
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={timer.reset}
                  className="w-24"
                >
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Reset
                </Button>
              </div>

              {/* Duration input */}
              <div className="flex items-center space-x-3">
                <label className="text-sm text-text-secondary">Duration:</label>
                <Input
                  type="number"
                  value={Math.floor(duration / 60)}
                  onChange={(e) => handleDurationChange(Number(e.target.value) * 60)}
                  min={1}
                  max={60}
                  disabled={timer.isRunning || timer.isPaused}
                  className="w-20 text-center"
                />
                <span className="text-sm text-text-secondary">minutes</span>
              </div>

              {/* Settings */}
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="gap-2"
                >
                  {soundEnabled ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                  <span className="text-xs">Sound</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleNotifications}
                  className="gap-2"
                >
                  {notificationsEnabled ? (
                    <Bell className="h-4 w-4" />
                  ) : (
                    <BellOff className="h-4 w-4" />
                  )}
                  <span className="text-xs">Notify</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
