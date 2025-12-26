"use client";

/**
 * HIIT Timer Component (Refactored)
 *
 * Migrated to use the new useTimerRunner hook for consistent timer behavior.
 * Maintains backward compatibility with existing HIIT presets and configuration.
 */

import { useState, useMemo } from 'react';
import { Play, Pause, RotateCcw, Settings, Zap, Coffee, Volume2, VolumeX, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTimerRunner, requestNotificationPermission } from '@/lib/hooks/useTimerRunner';
import type { IntervalWorkRestParams } from '@/timers';
import {
  formatTime,
  HIIT_PRESETS,
  type HIITConfig,
} from '@/lib/timer-utils';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert HIIT config to timer params
 */
function hiitConfigToTimerParams(config: HIITConfig): IntervalWorkRestParams {
  return {
    kind: 'INTERVAL_WORK_REST',
    workSeconds: config.workDuration,
    restSeconds: config.restDuration,
    totalRounds: config.rounds,
    // Note: prepSeconds is not supported by IntervalWorkRestParams yet
    // TODO: Add prep time support to timer engine if needed
  };
}

/**
 * Get progress bar color
 */
function getProgressBarColor(kind: string): string {
  switch (kind) {
    case 'prep':
      return 'bg-secondary';
    case 'work':
      return 'bg-primary';
    case 'rest':
      return 'bg-rest';
    default:
      return 'bg-gray-400';
  }
}

// ============================================================================
// Component
// ============================================================================

export function HIITTimer() {
  // Configuration state
  const [config, setConfig] = useState<HIITConfig>(HIIT_PRESETS[0].config);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Convert config to timer params
  const timerParams = useMemo(() => hiitConfigToTimerParams(config), [config]);

  // Timer hook
  const timer = useTimerRunner({
    params: timerParams,
    enableSound: soundEnabled,
    enableNotifications: notificationsEnabled,
    persistKey: 'hiit-timer-state',
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

  // Load preset
  const loadPreset = (presetName: string) => {
    const preset = HIIT_PRESETS.find((p) => p.name === presetName);
    if (preset) {
      setConfig(preset.config);
      timer.reset();
      setShowSettings(false);
    }
  };

  // Calculate current round from segment
  const currentRound = timer.currentSegment?.loopIndex ?? 0;

  // Calculate progress
  const totalDuration = config.prepTime + (config.workDuration + config.restDuration) * config.rounds;
  const elapsedDuration = timer.state.totalElapsedMs / 1000;
  const progress = (elapsedDuration / totalDuration) * 100;

  // Determine if in prep phase
  const isPrepPhase = timer.currentSegment?.kind === 'prep';
  const isWorkPhase = timer.currentSegment?.kind === 'work';

  return (
    <div className="space-y-6">
      {/* Main Timer */}
      <Card className="bg-gradient-to-br from-surface to-surface-elevated">
        <CardContent className="p-8">
          <div className="flex flex-col items-center space-y-6">
            {/* Phase Indicator */}
            <div className="flex items-center gap-3">
              {isPrepPhase ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/20 text-secondary border border-secondary/30">
                  <Settings className="h-5 w-5" />
                  <span className="font-semibold">GET READY</span>
                </div>
              ) : isWorkPhase ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary border border-primary/30 animate-pulse">
                  <Zap className="h-5 w-5" />
                  <span className="font-semibold">WORK</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-rest/20 text-rest border border-rest/30">
                  <Coffee className="h-5 w-5" />
                  <span className="font-semibold">REST</span>
                </div>
              )}
            </div>

            {/* Round Counter */}
            <div className="text-2xl font-bold text-text-primary">
              {timer.isCompleted ? (
                <span>Complete! 🎉</span>
              ) : isPrepPhase ? (
                <span>Round 1 / {config.rounds}</span>
              ) : (
                <span>Round {currentRound} / {config.rounds}</span>
              )}
            </div>

            {/* Main Time Display */}
            <div className="text-8xl font-bold text-text-primary tabular-nums">
              {formatTime(Math.ceil(timer.remainingMs / 1000))}
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-md">
              <div className="w-full bg-surface rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    timer.currentSegment ? getProgressBarColor(timer.currentSegment.kind) : 'bg-gray-400'
                  }`}
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-text-secondary">
                <span>{formatTime(Math.floor(elapsedDuration))}</span>
                <span>{formatTime(totalDuration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {timer.isRunning ? (
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={timer.pause}
                  className="w-32"
                >
                  <Pause className="h-5 w-5 mr-2" />
                  Pause
                </Button>
              ) : timer.isPaused ? (
                <Button
                  size="lg"
                  onClick={timer.resume}
                  className="w-32"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Resume
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={timer.start}
                  className="w-32"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Start
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                onClick={timer.reset}
                className="w-32"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Reset
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>

            {/* Sound & Notification Controls */}
            <div className="flex gap-2">
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
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle>Timer Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Presets */}
            <div className="space-y-2">
              <Label>Presets</Label>
              <div className="grid grid-cols-2 gap-2">
                {HIIT_PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    onClick={() => loadPreset(preset.name)}
                    disabled={timer.isRunning || timer.isPaused}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Config */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="work">Work (seconds)</Label>
                <Input
                  id="work"
                  type="number"
                  value={config.workDuration}
                  onChange={(e) =>
                    setConfig({ ...config, workDuration: Number(e.target.value) })
                  }
                  disabled={timer.isRunning || timer.isPaused}
                  min={5}
                  max={300}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rest">Rest (seconds)</Label>
                <Input
                  id="rest"
                  type="number"
                  value={config.restDuration}
                  onChange={(e) =>
                    setConfig({ ...config, restDuration: Number(e.target.value) })
                  }
                  disabled={timer.isRunning || timer.isPaused}
                  min={5}
                  max={300}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rounds">Rounds</Label>
                <Input
                  id="rounds"
                  type="number"
                  value={config.rounds}
                  onChange={(e) =>
                    setConfig({ ...config, rounds: Number(e.target.value) })
                  }
                  disabled={timer.isRunning || timer.isPaused}
                  min={1}
                  max={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prep">Prep Time (seconds)</Label>
                <Input
                  id="prep"
                  type="number"
                  value={config.prepTime}
                  onChange={(e) =>
                    setConfig({ ...config, prepTime: Number(e.target.value) })
                  }
                  disabled={timer.isRunning || timer.isPaused}
                  min={0}
                  max={60}
                />
              </div>
            </div>

            <div className="text-sm text-text-secondary">
              Total workout time: {formatTime(totalDuration)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
