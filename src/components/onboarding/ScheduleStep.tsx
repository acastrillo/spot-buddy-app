'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface ScheduleStepProps {
  trainingDays: number;
  sessionDuration: number | null;
  onTrainingDaysChange: (value: number) => void;
  onSessionDurationChange: (value: number | null) => void;
}

export function ScheduleStep({
  trainingDays,
  sessionDuration,
  onTrainingDaysChange,
  onSessionDurationChange,
}: ScheduleStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
          What&apos;s your training schedule?
        </h2>
        <p className="text-[var(--text-secondary)]">
          Help us plan your workout frequency and duration
        </p>
      </div>

      <div className="space-y-6 max-w-md">
        <div>
          <Label htmlFor="trainingDays" className="text-[var(--text-primary)]">
            How many days per week can you train? <span className="text-[var(--destructive)]">*</span>
          </Label>
          <div className="mt-3 grid grid-cols-7 gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <button
                key={day}
                onClick={() => onTrainingDaysChange(day)}
                className={`h-12 rounded-lg border-2 font-semibold transition-all ${
                  trainingDays === day
                    ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)]/50'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="sessionDuration" className="text-[var(--text-primary)]">
            Session Duration (minutes, optional)
          </Label>
          <Input
            id="sessionDuration"
            type="number"
            min="15"
            max="180"
            value={sessionDuration ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                onSessionDurationChange(null); // Allow empty/optional
              } else {
                const num = parseInt(value);
                if (!isNaN(num)) {
                  onSessionDurationChange(num);
                }
              }
            }}
            placeholder="e.g. 60"
            className="mt-2"
          />
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Leave blank if you don&apos;t have a set time
          </p>
        </div>
      </div>
    </div>
  );
}
