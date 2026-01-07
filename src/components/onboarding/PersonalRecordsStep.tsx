'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { COMMON_EXERCISES, type PersonalRecord } from '@/lib/training-profile';
import { Trash2 } from 'lucide-react';

interface PersonalRecordsStepProps {
  personalRecords: Record<string, PersonalRecord>;
  onPersonalRecordsChange: (records: Record<string, PersonalRecord>) => void;
}

export function PersonalRecordsStep({
  personalRecords,
  onPersonalRecordsChange,
}: PersonalRecordsStepProps) {
  const [exercise, setExercise] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [unit, setUnit] = useState<'kg' | 'lbs'>('lbs');

  const addPR = () => {
    if (!exercise || !weight || !reps) return;

    const newPR: PersonalRecord = {
      weight: parseFloat(weight),
      reps: parseInt(reps),
      unit,
      date: new Date().toISOString().split('T')[0],
    };

    onPersonalRecordsChange({
      ...personalRecords,
      [exercise]: newPR,
    });

    // Reset form
    setExercise('');
    setWeight('');
    setReps('');
  };

  const deletePR = (exerciseName: string) => {
    const updated = { ...personalRecords };
    delete updated[exerciseName];
    onPersonalRecordsChange(updated);
  };

  const prEntries = Object.entries(personalRecords);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
          Add your personal records
        </h2>
        <p className="text-[var(--text-secondary)]">
          Optional: Track your PRs to monitor strength progress. You can skip and add these later.
        </p>
      </div>

      {/* PR Entry Form */}
      <div className="space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="exercise" className="text-[var(--text-primary)]">
              Exercise
            </Label>
            <select
              id="exercise"
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
              className="mt-2 w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="">Select exercise</option>
              {COMMON_EXERCISES.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="weight" className="text-[var(--text-primary)]">
              Weight
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="weight"
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="225"
                className="flex-1"
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as 'kg' | 'lbs')}
                className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option value="lbs">lbs</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="reps" className="text-[var(--text-primary)]">
              Reps
            </Label>
            <Input
              id="reps"
              type="number"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder="5"
              className="mt-2"
            />
          </div>

          <div className="flex items-end">
            <Button
              onClick={addPR}
              disabled={!exercise || !weight || !reps}
              className="w-full"
            >
              Add PR
            </Button>
          </div>
        </div>
      </div>

      {/* Existing PRs */}
      {prEntries.length > 0 && (
        <div className="space-y-2 max-w-2xl">
          <h3 className="font-semibold text-[var(--text-primary)]">Your PRs</h3>
          <div className="space-y-2">
            {prEntries.map(([exerciseName, pr]) => (
              <div
                key={exerciseName}
                className="flex items-center justify-between p-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]"
              >
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{exerciseName}</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {pr.weight} {pr.unit} × {pr.reps} reps
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deletePR(exerciseName)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {prEntries.length === 0 && (
        <p className="text-sm text-[var(--text-secondary)]">
          No PRs added yet. You can skip this step and add them later in settings.
        </p>
      )}
    </div>
  );
}
