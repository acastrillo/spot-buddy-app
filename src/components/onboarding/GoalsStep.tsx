'use client';

import { TRAINING_GOALS } from '@/lib/training-profile';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface GoalsStepProps {
  goals: string[];
  onGoalsChange: (goals: string[]) => void;
}

export function GoalsStep({ goals, onGoalsChange }: GoalsStepProps) {
  const toggleGoal = (goal: string) => {
    if (goals.includes(goal)) {
      onGoalsChange(goals.filter((g) => g !== goal));
    } else {
      onGoalsChange([...goals, goal]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
          What are your training goals?
        </h2>
        <p className="text-[var(--text-secondary)]">
          Select at least one goal. This helps us personalize your workouts.
        </p>
      </div>

      <div className="space-y-3 max-w-2xl">
        {TRAINING_GOALS.map((goal) => (
          <div
            key={goal}
            className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
              goals.includes(goal)
                ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                : 'border-[var(--border)] hover:border-[var(--primary)]/50'
            }`}
            onClick={() => toggleGoal(goal)}
          >
            <Checkbox
              id={`goal-${goal}`}
              checked={goals.includes(goal)}
              onCheckedChange={() => toggleGoal(goal)}
              className="mt-1"
            />
            <Label
              htmlFor={`goal-${goal}`}
              className="text-sm font-normal cursor-pointer flex-1 text-[var(--text-primary)]"
            >
              {goal}
            </Label>
          </div>
        ))}
      </div>

      {goals.length === 0 && (
        <p className="text-sm text-[var(--destructive)]">
          Please select at least one goal to continue
        </p>
      )}

      {goals.length > 0 && (
        <p className="text-sm text-[var(--text-secondary)]">
          {goals.length} {goals.length === 1 ? 'goal' : 'goals'} selected
        </p>
      )}
    </div>
  );
}
