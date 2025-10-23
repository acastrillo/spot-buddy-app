'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { DynamoDBUser } from '@/lib/dynamodb';

type TrainingProfile = DynamoDBUser['trainingProfile'];

const TRAINING_GOALS = [
  'Strength gain',
  'Muscle building (hypertrophy)',
  'Fat loss',
  'Endurance',
  'Athletic performance',
  'General fitness',
  'Rehabilitation/Recovery',
];

const EQUIPMENT_OPTIONS = [
  'Full gym access',
  'Home gym',
  'Dumbbells only',
  'Bodyweight only',
  'Resistance bands',
  'Kettlebells',
  'Barbell',
];

const COMMON_EXERCISES = [
  'Bench Press',
  'Squat',
  'Deadlift',
  'Overhead Press',
  'Pull-ups',
  'Rows',
  'Lunges',
  'Romanian Deadlift',
  'Dips',
  'Curls',
];

export default function TrainingProfilePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<TrainingProfile>({
    experienceLevel: 'intermediate',
    goals: [],
    favoriteExercises: [],
    dislikedExercises: [],
    equipment: [],
    preferredDuration: 60,
    trainingFrequency: 4,
    energyLevels: 'flexible',
    manualPRs: {},
    trainingFocus: '',
    constraints: '',
  });

  // Load existing profile
  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/auth/login');
      return;
    }

    const loadProfile = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const data = await response.json();
          if (data.profile) {
            setProfile({ ...profile, ...data.profile });
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isAuthenticated, user, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        alert('Training profile saved successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to save profile: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleGoal = (goal: string) => {
    setProfile((prev) => ({
      ...prev,
      goals: prev.goals?.includes(goal)
        ? prev.goals.filter((g) => g !== goal)
        : [...(prev.goals || []), goal],
    }));
  };

  const toggleEquipment = (equipment: string) => {
    setProfile((prev) => ({
      ...prev,
      equipment: prev.equipment?.includes(equipment)
        ? prev.equipment.filter((e) => e !== equipment)
        : [...(prev.equipment || []), equipment],
    }));
  };

  const toggleFavoriteExercise = (exercise: string) => {
    setProfile((prev) => ({
      ...prev,
      favoriteExercises: prev.favoriteExercises?.includes(exercise)
        ? prev.favoriteExercises.filter((e) => e !== exercise)
        : [...(prev.favoriteExercises || []), exercise],
    }));
  };

  const toggleDislikedExercise = (exercise: string) => {
    setProfile((prev) => ({
      ...prev,
      dislikedExercises: prev.dislikedExercises?.includes(exercise)
        ? prev.dislikedExercises.filter((e) => e !== exercise)
        : [...(prev.dislikedExercises || []), exercise],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <Button
        variant="ghost"
        onClick={() => router.push('/settings')}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Settings
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Training Profile</h1>
        <p className="text-muted-foreground mt-2">
          Help AI provide personalized workout recommendations by sharing your training preferences
          and goals.
        </p>
      </div>

      <div className="space-y-6">
        {/* Experience Level */}
        <Card>
          <CardHeader>
            <CardTitle>Experience Level</CardTitle>
            <CardDescription>Your current fitness experience</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={profile.experienceLevel}
              onValueChange={(value: any) =>
                setProfile({ ...profile, experienceLevel: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Training Goals */}
        <Card>
          <CardHeader>
            <CardTitle>Training Goals</CardTitle>
            <CardDescription>What are you working towards? (Select all that apply)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {TRAINING_GOALS.map((goal) => (
                <div key={goal} className="flex items-center space-x-2">
                  <Checkbox
                    id={goal}
                    checked={profile.goals?.includes(goal)}
                    onCheckedChange={() => toggleGoal(goal)}
                  />
                  <Label htmlFor={goal} className="cursor-pointer">
                    {goal}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Equipment */}
        <Card>
          <CardHeader>
            <CardTitle>Available Equipment</CardTitle>
            <CardDescription>What equipment do you have access to?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {EQUIPMENT_OPTIONS.map((equipment) => (
                <div key={equipment} className="flex items-center space-x-2">
                  <Checkbox
                    id={equipment}
                    checked={profile.equipment?.includes(equipment)}
                    onCheckedChange={() => toggleEquipment(equipment)}
                  />
                  <Label htmlFor={equipment} className="cursor-pointer">
                    {equipment}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Workout Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Workout Preferences</CardTitle>
            <CardDescription>Your typical workout schedule</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="duration">Preferred Workout Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="15"
                max="180"
                value={profile.preferredDuration || 60}
                onChange={(e) =>
                  setProfile({ ...profile, preferredDuration: parseInt(e.target.value) })
                }
              />
            </div>
            <div>
              <Label htmlFor="frequency">Training Frequency (days per week)</Label>
              <Input
                id="frequency"
                type="number"
                min="1"
                max="7"
                value={profile.trainingFrequency || 4}
                onChange={(e) =>
                  setProfile({ ...profile, trainingFrequency: parseInt(e.target.value) })
                }
              />
            </div>
            <div>
              <Label htmlFor="energy">Energy Levels</Label>
              <Select
                value={profile.energyLevels}
                onValueChange={(value: any) =>
                  setProfile({ ...profile, energyLevels: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning Person</SelectItem>
                  <SelectItem value="evening">Evening Person</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Exercise Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Exercise Preferences</CardTitle>
            <CardDescription>Exercises you love and exercises you'd rather avoid</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="mb-3 block">Favorite Exercises</Label>
              <div className="grid grid-cols-2 gap-4">
                {COMMON_EXERCISES.map((exercise) => (
                  <div key={exercise} className="flex items-center space-x-2">
                    <Checkbox
                      id={`fav-${exercise}`}
                      checked={profile.favoriteExercises?.includes(exercise)}
                      onCheckedChange={() => toggleFavoriteExercise(exercise)}
                    />
                    <Label htmlFor={`fav-${exercise}`} className="cursor-pointer text-sm">
                      {exercise}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-3 block">Disliked/Avoid Exercises</Label>
              <div className="grid grid-cols-2 gap-4">
                {COMMON_EXERCISES.map((exercise) => (
                  <div key={exercise} className="flex items-center space-x-2">
                    <Checkbox
                      id={`dis-${exercise}`}
                      checked={profile.dislikedExercises?.includes(exercise)}
                      onCheckedChange={() => toggleDislikedExercise(exercise)}
                    />
                    <Label htmlFor={`dis-${exercise}`} className="cursor-pointer text-sm">
                      {exercise}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Training Focus */}
        <Card>
          <CardHeader>
            <CardTitle>Training Focus</CardTitle>
            <CardDescription>What are you training for?</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="E.g., Powerlifting meet, marathon, general health, bodybuilding competition..."
              value={profile.trainingFocus || ''}
              onChange={(e) => setProfile({ ...profile, trainingFocus: e.target.value })}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Constraints */}
        <Card>
          <CardHeader>
            <CardTitle>Constraints & Limitations</CardTitle>
            <CardDescription>
              Any injuries, limitations, or other constraints we should know about
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="E.g., Lower back injury, limited mobility, time constraints..."
              value={profile.constraints || ''}
              onChange={(e) => setProfile({ ...profile, constraints: e.target.value })}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Training Profile
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
