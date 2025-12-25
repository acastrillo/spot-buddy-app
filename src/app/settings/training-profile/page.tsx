'use client';

/**
 * Training Profile Page
 *
 * Allows users to:
 * - Enter personal records (PRs)
 * - Set training preferences (experience, goals, equipment)
 * - Add constraints/injuries
 * - Configure training schedule
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  type TrainingProfile,
  type PersonalRecord,
  EQUIPMENT_OPTIONS,
  TRAINING_GOALS,
  COMMON_EXERCISES,
  calculate1RM,
} from '@/lib/training-profile';

export default function TrainingProfilePage() {
  const { status } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<TrainingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // PR entry form
  const [newPR, setNewPR] = useState({
    exercise: '',
    weight: '',
    reps: '',
    unit: 'lbs' as 'kg' | 'lbs',
  });

  // Fetch profile on mount
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    if (status === 'authenticated') {
      fetchProfile();
    }
  }, [status, router]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!profile) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Profile saved successfully!' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to save profile' });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  const addPR = async () => {
    if (!newPR.exercise || !newPR.weight || !newPR.reps) {
      setMessage({ type: 'error', text: 'Please fill all PR fields' });
      return;
    }

    const pr: PersonalRecord = {
      weight: parseFloat(newPR.weight),
      reps: parseInt(newPR.reps),
      unit: newPR.unit,
      date: new Date().toISOString().split('T')[0],
    };

    try {
      const res = await fetch('/api/user/profile/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercise: newPR.exercise, pr }),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setNewPR({ exercise: '', weight: '', reps: '', unit: 'lbs' });
        setMessage({ type: 'success', text: 'PR added!' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      console.error('Error adding PR:', error);
      setMessage({ type: 'error', text: 'Failed to add PR' });
    }
  };

  const deletePR = async (exercise: string) => {
    try {
      const res = await fetch(`/api/user/profile/pr?exercise=${encodeURIComponent(exercise)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setMessage({ type: 'success', text: 'PR deleted' });
      }
    } catch (error) {
      console.error('Error deleting PR:', error);
      setMessage({ type: 'error', text: 'Failed to delete PR' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-xl">Loading profile...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-xl text-red-500">Failed to load profile</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-6 pb-24">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Training Profile</h1>
          <p className="text-[var(--muted-foreground)] mt-2">
            Personalize your AI workout enhancements with your PRs, goals, and preferences
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
            {message.text}
          </div>
        )}

        {/* Experience Level */}
        <div className="bg-[var(--surface)] p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Experience Level</h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setProfile({ ...profile, experience: level })}
                className={`px-3 py-3 sm:px-6 rounded-lg capitalize text-sm sm:text-base ${
                  profile.experience === level
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--surface-2)] hover:bg-[var(--surface-3)]'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Training Schedule */}
        <div className="bg-[var(--surface)] p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Training Schedule</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm mb-2">Days per week</label>
              <input
                type="number"
                min="1"
                max="7"
                value={profile.trainingDays}
                onChange={(e) => setProfile({ ...profile, trainingDays: parseInt(e.target.value) || 4 })}
                className="w-full px-4 py-2 bg-[var(--surface-2)] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Session duration (minutes)</label>
              <input
                type="number"
                min="15"
                max="180"
                value={profile.sessionDuration || 60}
                onChange={(e) => setProfile({ ...profile, sessionDuration: parseInt(e.target.value) || 60 })}
                className="w-full px-4 py-2 bg-[var(--surface-2)] rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Personal Records */}
        <div className="bg-[var(--surface)] p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Personal Records</h2>

          {/* Add PR Form */}
          <div className="space-y-3 mb-6">
            <select
              value={newPR.exercise}
              onChange={(e) => setNewPR({ ...newPR, exercise: e.target.value })}
              className="w-full px-4 py-2 bg-[var(--surface-2)] rounded-lg"
            >
              <option value="">Select exercise</option>
              {COMMON_EXERCISES.map((ex) => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                placeholder="Weight"
                value={newPR.weight}
                onChange={(e) => setNewPR({ ...newPR, weight: e.target.value })}
                className="px-4 py-2 bg-[var(--surface-2)] rounded-lg"
              />
              <input
                type="number"
                placeholder="Reps"
                value={newPR.reps}
                onChange={(e) => setNewPR({ ...newPR, reps: e.target.value })}
                className="px-4 py-2 bg-[var(--surface-2)] rounded-lg"
              />
            </div>
            <button
              onClick={addPR}
              className="w-full px-4 py-3 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 font-semibold"
            >
              Add PR
            </button>
          </div>

          {/* PR List */}
          {Object.keys(profile.personalRecords).length === 0 ? (
            <p className="text-[var(--muted-foreground)] text-center py-8">
              No PRs yet. Add your first one above!
            </p>
          ) : (
            <div className="space-y-2">
              {Object.entries(profile.personalRecords).map(([exercise, pr]) => {
                const oneRM = calculate1RM(pr.weight, pr.reps);
                return (
                  <div key={exercise} className="flex items-center justify-between bg-[var(--surface-2)] p-4 rounded-lg">
                    <div>
                      <div className="font-semibold">{exercise}</div>
                      <div className="text-sm text-[var(--muted-foreground)]">
                        {pr.weight} {pr.unit} × {pr.reps} reps (Est. 1RM: {oneRM} {pr.unit})
                      </div>
                    </div>
                    <button
                      onClick={() => deletePR(exercise)}
                      className="px-3 py-1 text-red-500 hover:bg-red-500/10 rounded"
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Equipment */}
        <div className="bg-[var(--surface)] p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Available Equipment</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {EQUIPMENT_OPTIONS.map((eq) => (
              <label key={eq} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.equipment.includes(eq)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setProfile({ ...profile, equipment: [...profile.equipment, eq] });
                    } else {
                      setProfile({ ...profile, equipment: profile.equipment.filter(e => e !== eq) });
                    }
                  }}
                  className="w-4 h-4"
                />
                <span>{eq}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Training Goals */}
        <div className="bg-[var(--surface)] p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Training Goals</h2>
          <div className="space-y-2">
            {TRAINING_GOALS.map((goal) => (
              <label key={goal} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.goals.includes(goal)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setProfile({ ...profile, goals: [...profile.goals, goal] });
                    } else {
                      setProfile({ ...profile, goals: profile.goals.filter(g => g !== goal) });
                    }
                  }}
                  className="w-4 h-4"
                />
                <span>{goal}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={saveProfile}
          disabled={saving}
          className="w-full py-4 bg-[var(--primary)] text-white rounded-lg text-lg font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}
