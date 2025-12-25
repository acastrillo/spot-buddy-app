"use client";

/**
 * Unified Timer Component
 *
 * Comprehensive timer UI component supporting all timer types.
 * Uses the new useTimerRunner hook for state management.
 */

import { useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTimerRunner, requestNotificationPermission } from '@/lib/hooks/useTimerRunner';
import { TIMER_TEMPLATES } from '@/timers';

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
 * Format milliseconds to human-readable string
 */
function formatTimeHuman(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (secs === 0) {
    return `${mins}m`;
  }
  return `${mins}m ${secs}s`;
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
// Component Props
// ============================================================================

export interface UnifiedTimerProps {
  initialTemplateId?: string;
  onComplete?: () => void;
  persistKey?: string;
}

// ============================================================================
// UnifiedTimer Component
// ============================================================================

export function UnifiedTimer({
  initialTemplateId = 'TABATA_CLASSIC',
  onComplete,
  persistKey = 'unified-timer-state',
}: UnifiedTimerProps) {
  // Template selection
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId);
  const selectedTemplate = TIMER_TEMPLATES.find((t) => t.id === selectedTemplateId) || TIMER_TEMPLATES[0];

  // Sound and notification settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Timer hook
  const timer = useTimerRunner({
    params: selectedTemplate.defaultParams,
    enableSound: soundEnabled,
    enableNotifications: notificationsEnabled,
    onComplete,
    persistKey: `${persistKey}-${selectedTemplateId}`,
  });

  // Handle notification permission request
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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Workout Timer</span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute sound' : 'Enable sound'}
            >
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleNotifications}
              title={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
            >
              {notificationsEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Timer Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Timer Type</label>
          <Select
            value={selectedTemplateId}
            onValueChange={setSelectedTemplateId}
            disabled={timer.isRunning || timer.isPaused}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMER_TEMPLATES.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {selectedTemplate.description}
          </p>
        </div>

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
                : `Total: ${formatTimeHuman(timer.totalRemainingMs)}`}
            </div>
          </div>
        </div>

        {/* Next Segment Preview */}
        {timer.nextSegment && !timer.isCompleted && (
          <div className="text-center text-sm text-muted-foreground">
            Next: {timer.nextSegment.label} ({formatTimeHuman(timer.nextSegment.durationMs)})
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

        {/* Status Info */}
        <div className="text-center text-sm text-muted-foreground">
          {timer.state.segments.length} segments • {formatTimeHuman(timer.totalDurationMs)} total
        </div>
      </CardContent>
    </Card>
  );
}
