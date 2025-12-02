"use client";

/**
 * Rest Timer Component (Refactored)
 *
 * Simple countdown timer for rest periods between exercises.
 * Migrated to use the new useTimerRunner hook with a single rest segment.
 */

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Clock, Play, Pause, X } from 'lucide-react';
import { useTimerRunner } from '@/lib/hooks/useTimerRunner';
import type { AMRAPParams } from '@/timers';
import { formatTime, REST_PRESETS } from '@/lib/timer-utils';

// ============================================================================
// Props
// ============================================================================

interface RestTimerProps {
  onClose?: () => void;
  autoStart?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function RestTimer({ onClose, autoStart = false }: RestTimerProps) {
  const [duration, setDuration] = useState(60);
  const [isExpanded, setIsExpanded] = useState(false);

  // Create timer params for a simple countdown (using AMRAP as single segment)
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
    enableSound: true,
    enableNotifications: false,
  });

  // Auto-expand when timer starts
  useEffect(() => {
    if (timer.isRunning || timer.isPaused) {
      setIsExpanded(true);
    }
  }, [timer.isRunning, timer.isPaused]);

  // Handle completion
  useEffect(() => {
    if (timer.isCompleted) {
      setIsExpanded(true);
    }
  }, [timer.isCompleted]);

  const startTimer = (seconds: number) => {
    setDuration(seconds);
    setIsExpanded(false);
    // Timer will auto-restart when duration changes
    setTimeout(() => {
      timer.reset();
      timer.start();
    }, 0);
  };

  const reset = () => {
    timer.reset();
    setIsExpanded(false);
    onClose?.();
  };

  // Collapsed preset buttons (when timer is idle and not expanded)
  if (!isExpanded && timer.state.status === 'IDLE' && !timer.isPaused) {
    return (
      <Card className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50 shadow-lg">
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
              <Clock className="h-4 w-4" />
              <span>Rest Timer</span>
            </div>
            {onClose && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {REST_PRESETS.map((preset) => (
              <Button
                key={preset.value}
                size="sm"
                variant="outline"
                onClick={() => startTimer(preset.value)}
                className="h-8 text-xs"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  // Running/paused/completed timer display
  return (
    <Card className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50 shadow-lg">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <Clock className="h-4 w-4" />
            <span>Rest Timer</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={reset}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Timer Display */}
        <div className="flex flex-col items-center space-y-3">
          <div className="text-4xl font-bold text-text-primary tabular-nums">
            {formatTime(Math.ceil(timer.remainingMs / 1000))}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-surface rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{
                width: `${timer.totalDurationMs > 0
                  ? ((timer.state.totalElapsedMs / timer.totalDurationMs) * 100)
                  : 0}%`,
              }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {timer.isRunning ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={timer.pause}
                className="w-20"
              >
                <Pause className="h-3 w-3 mr-1" />
                Pause
              </Button>
            ) : timer.isPaused ? (
              <Button
                size="sm"
                variant="default"
                onClick={timer.resume}
                className="w-20"
              >
                <Play className="h-3 w-3 mr-1" />
                Resume
              </Button>
            ) : (
              <Button
                size="sm"
                variant="default"
                onClick={timer.start}
                disabled={timer.isCompleted}
                className="w-20"
              >
                <Play className="h-3 w-3 mr-1" />
                Start
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={timer.reset}
              className="w-20"
            >
              Reset
            </Button>
          </div>

          {/* Quick restart buttons */}
          {timer.isCompleted && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              <span className="text-xs text-text-secondary w-full text-center">
                Start another rest:
              </span>
              {REST_PRESETS.slice(0, 4).map((preset) => (
                <Button
                  key={preset.value}
                  size="sm"
                  variant="outline"
                  onClick={() => startTimer(preset.value)}
                  className="h-7 text-xs flex-1"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
