/**
 * Timer Playground Page
 *
 * Testing and demonstration page for the new timer system.
 * Showcases all timer types and features.
 */

import { UnifiedTimer } from '@/components/timer/unified-timer';

export default function TimerPlaygroundPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Timer Playground</h1>
          <p className="text-muted-foreground">
            Test and explore the new workout timer system
          </p>
        </div>

        {/* Timer */}
        <UnifiedTimer persistKey="timer-playground" />

        {/* Information Cards */}
        <div className="grid md:grid-cols-2 gap-6 mt-12">
          {/* Available Timer Types */}
          <div className="p-6 border rounded-lg space-y-3">
            <h2 className="text-xl font-semibold">Available Timer Types</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <strong>EMOM</strong> - Every Minute On the Minute
                <p className="text-muted-foreground">
                  Complete work within each minute, rest for remainder
                </p>
              </li>
              <li>
                <strong>AMRAP</strong> - As Many Rounds As Possible
                <p className="text-muted-foreground">
                  Complete as many rounds as possible within time limit
                </p>
              </li>
              <li>
                <strong>Interval Work/Rest</strong> - Alternating intervals
                <p className="text-muted-foreground">
                  Work and rest periods repeated for specified rounds
                </p>
              </li>
              <li>
                <strong>Tabata</strong> - High-intensity intervals
                <p className="text-muted-foreground">
                  Typically 20s work, 10s rest for 8 rounds
                </p>
              </li>
            </ul>
          </div>

          {/* Features */}
          <div className="p-6 border rounded-lg space-y-3">
            <h2 className="text-xl font-semibold">Features</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Platform-agnostic timer engine</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Pause/resume with accurate time tracking</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Sound alerts on segment changes</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Browser notifications (with permission)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>LocalStorage persistence</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Circular progress visualization</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Pre-configured templates</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Technical Details */}
        <div className="p-6 border rounded-lg space-y-4">
          <h2 className="text-xl font-semibold">Technical Details</h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <h3 className="font-medium mb-2">Core Engine</h3>
              <p className="text-muted-foreground">
                Pure TypeScript functions with zero browser dependencies.
                Works in Node.js and React Native.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">React Hook</h3>
              <p className="text-muted-foreground">
                useTimerRunner hook manages state, persistence, and browser APIs.
                Easy to integrate into any component.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">State Management</h3>
              <p className="text-muted-foreground">
                Immutable state updates using pure functions.
                Predictable behavior with accurate pause/resume.
              </p>
            </div>
          </div>
        </div>

        {/* Usage Example */}
        <div className="p-6 border rounded-lg space-y-3">
          <h2 className="text-xl font-semibold">Quick Start</h2>
          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm">
            <code>{`import { useTimerRunner } from '@/lib/hooks/useTimerRunner';

function MyTimer() {
  const timer = useTimerRunner({
    params: {
      kind: 'TABATA',
      workSeconds: 20,
      restSeconds: 10,
      rounds: 8,
    },
    enableSound: true,
    enableNotifications: true,
  });

  return (
    <div>
      <h1>{timer.currentSegment?.label}</h1>
      <p>Remaining: {formatTime(timer.remainingMs)}</p>
      <button onClick={timer.isRunning ? timer.pause : timer.start}>
        {timer.isRunning ? 'Pause' : 'Start'}
      </button>
      <button onClick={timer.reset}>Reset</button>
    </div>
  );
}`}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
