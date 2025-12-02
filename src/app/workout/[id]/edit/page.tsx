"use client"

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
  Timer,
  Sparkles,
} from "lucide-react";

import { useAuthStore } from "@/store";
import { Login } from "@/components/auth/login";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  buildLocalWorkoutPayload,
  denormaliseExercises,
  EditableExercise,
  EditableSet,
  EditableWorkoutState,
  normaliseWorkoutForEditing,
  type StoredWorkout,
} from "@/lib/workouts/types";
import { TIMER_TEMPLATES, type TimerParams } from "@/timers";

type WorkoutSource = "dynamodb" | "local";

const makeId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const createSnapshot = (
  meta: EditableWorkoutState["meta"],
  exercises: EditableExercise[]
) =>
  JSON.stringify({
    meta: {
      title: meta.title,
      description: meta.description,
      timerConfig: meta.timerConfig,
    },
    exercises: exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      notes: exercise.notes,
      restSeconds: exercise.restSeconds,
      setDetails: exercise.setDetails.map((set) => ({
        id: set.id,
        reps: set.reps,
        weight: set.weight,
      })),
    })),
  });

const formatWorkoutDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

const createEmptySet = (): EditableSet => ({
  id: makeId(),
  reps: "",
  weight: "",
});

const createEmptyExercise = (): EditableExercise => ({
  id: makeId(),
  name: "",
  notes: null,
  restSeconds: null,
  setDetails: [createEmptySet()],
});

interface ExerciseCardProps {
  exercise: EditableExercise;
  index: number;
  validationErrors: Record<string, string>;
  onNameChange: (value: string) => void;
  onSetChange: (setId: string, field: "reps" | "weight", value: string) => void;
  onRemoveSet: (setId: string) => void;
  onAddSet: () => void;
  onRemoveExercise: () => void;
}

function ExerciseCard({
  exercise,
  index,
  validationErrors,
  onNameChange,
  onSetChange,
  onRemoveSet,
  onAddSet,
  onRemoveExercise,
}: ExerciseCardProps) {
  return (
    <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-4 mb-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-700 text-xs font-semibold text-white">
            {index + 1}
          </div>
          <div className="flex-1">
            <Input
              value={exercise.name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Exercise name"
              className={cn(
                "border-slate-600 bg-slate-900/80 text-white placeholder:text-slate-400 focus:border-primary focus:ring-0 h-9",
                validationErrors[`exercise-${exercise.id}`] && "border-red-500 focus:border-red-500"
              )}
            />
            {validationErrors[`exercise-${exercise.id}`] && (
              <p className="mt-1 text-xs text-red-400">
                {validationErrors[`exercise-${exercise.id}`]}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          title="Remove exercise"
          onClick={onRemoveExercise}
          className="flex-shrink-0 p-1.5 text-slate-400 hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <p className="mb-3 text-xs text-slate-400">
        Exclude your bodyweight when inputting weight.
      </p>

      <div className="space-y-2">
        {exercise.setDetails.map((set, setIndex) => (
          <div
            key={set.id}
            className="flex items-center gap-3 rounded-xl bg-slate-900/60 p-3"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-700 text-xs font-semibold text-white">
              {setIndex + 1}
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-slate-400">
                  Reps
                </label>
                <Input
                  value={set.reps}
                  onChange={(event) => onSetChange(set.id, "reps", event.target.value)}
                  placeholder="0"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className={cn(
                    "border-slate-600 bg-slate-800 text-white placeholder:text-slate-500 focus:border-primary focus:ring-0 h-10 text-center font-medium",
                    validationErrors[`set-${set.id}-reps`] && "border-red-500 focus:border-red-500"
                  )}
                />
                {validationErrors[`set-${set.id}-reps`] && (
                  <p className="mt-1 text-xs text-red-400">
                    {validationErrors[`set-${set.id}-reps`]}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-slate-400">
                  Weight (lbs)
                </label>
                <Input
                  value={set.weight}
                  onChange={(event) => onSetChange(set.id, "weight", event.target.value)}
                  placeholder="0"
                  inputMode="decimal"
                  className="border-slate-600 bg-slate-800 text-white placeholder:text-slate-500 focus:border-primary focus:ring-0 h-10 text-center font-medium"
                />
              </div>
            </div>

            <button
              type="button"
              title="Remove set"
              onClick={() => onRemoveSet(set.id)}
              disabled={exercise.setDetails.length === 1}
              className="flex-shrink-0 p-1.5 text-slate-400 hover:text-red-400 transition-colors disabled:text-slate-600 disabled:cursor-not-allowed"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onAddSet}
          className="flex items-center gap-2 text-sm font-medium text-slate-300 transition hover:text-white"
        >
          <Plus className="h-4 w-4" />
          Add Set
        </button>
        <button
          type="button"
          onClick={onRemoveExercise}
          className="p-1 text-slate-500 hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export default function EditWorkoutPage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const [workoutMeta, setWorkoutMeta] = useState<EditableWorkoutState["meta"] | null>(null);
  const [exercises, setExercises] = useState<EditableExercise[]>([]);
  const [source, setSource] = useState<WorkoutSource>("local");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const initialSnapshotRef = useRef<string>("");

  useEffect(() => {
    const workoutId = params?.id as string | undefined;
    if (!workoutId) return;

    const loadWorkout = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        let workout: DynamoDBWorkout | StoredWorkout | null = null;
        if (user?.id) {
          const response = await fetch(`/api/workouts/${workoutId}`);
          if (response.ok) {
            const { workout: dbWorkout } = await response.json();
            if (dbWorkout) {
              workout = dbWorkout;
              setSource("dynamodb");
            }
          }
        }

        if (!workout) {
          const saved = JSON.parse(
            typeof window !== "undefined" ? localStorage.getItem("workouts") || "[]" : "[]"
          ) as StoredWorkout[];
          workout = saved.find((item) => item.id === workoutId) ?? null;
          setSource("local");
        }

        if (!workout) {
          setNotFound(true);
          setWorkoutMeta(null);
          setExercises([]);
          return;
        }

        const normalised = normaliseWorkoutForEditing(workout);
        setWorkoutMeta(normalised.meta);
        setExercises(normalised.exercises);
        initialSnapshotRef.current = createSnapshot(normalised.meta, normalised.exercises);
      } catch (error) {
        console.error("Error loading workout:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    void loadWorkout();
  }, [params?.id, user?.id]);

  const isDirty = useMemo(() => {
    if (!workoutMeta) return false;
    const currentSnapshot = createSnapshot(workoutMeta, exercises);
    return currentSnapshot !== initialSnapshotRef.current;
  }, [workoutMeta, exercises]);

  const clearError = (key: string) => {
    setValidationErrors((prev) => {
      if (!prev[key]) return prev;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleExerciseNameChange = (exerciseId: string, value: string) => {
    setExercises((prev) =>
      prev.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, name: value } : exercise
      )
    );
    clearError(`exercise-${exerciseId}`);
  };

  const handleSetChange = (
    exerciseId: string,
    setId: string,
    field: "reps" | "weight",
    value: string
  ) => {
    setExercises((prev) =>
      prev.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;
        return {
          ...exercise,
          setDetails: exercise.setDetails.map((set) =>
            set.id === setId ? { ...set, [field]: value } : set
          ),
        };
      })
    );
    if (field === "reps") {
      clearError(`set-${setId}-reps`);
    }
  };

  const handleAddSet = (exerciseId: string) => {
    setExercises((prev) =>
      prev.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              setDetails: [...exercise.setDetails, createEmptySet()],
            }
          : exercise
      )
    );
  };

  const handleRemoveSet = (exerciseId: string, setId: string) => {
    setExercises((prev) =>
      prev.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;
        if (exercise.setDetails.length === 1) {
          return exercise;
        }
        return {
          ...exercise,
          setDetails: exercise.setDetails.filter((set) => set.id !== setId),
        };
      })
    );
  };

  const handleAddExercise = () => {
    setExercises((prev) => [...prev, createEmptyExercise()]);
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setExercises((prev) => {
      if (prev.length === 1) {
        return [createEmptyExercise()];
      }
      return prev.filter((exercise) => exercise.id !== exerciseId);
    });
  };

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!workoutMeta?.title.trim()) {
      errors["meta-title"] = "Workout name is required.";
    }

    exercises.forEach((exercise) => {
      if (!exercise.name.trim()) {
        errors[`exercise-${exercise.id}`] = "Exercise name is required.";
      }
      exercise.setDetails.forEach((set) => {
        if (!set.reps.trim()) {
          errors[`set-${set.id}-reps`] = "Enter reps for this set.";
        }
      });
    });
    return errors;
  };

  const updateLocalCache = (payload: StoredWorkout) => {
    if (typeof window === "undefined") return;
    const existing = JSON.parse(localStorage.getItem("workouts") || "[]") as StoredWorkout[];
    const index = existing.findIndex((item) => item.id === payload.id);
    if (index >= 0) {
      existing[index] = payload;
    } else {
      existing.push(payload);
    }
    localStorage.setItem("workouts", JSON.stringify(existing));
  };

  const removeFromLocalCache = (workoutId: string) => {
    if (typeof window === "undefined") return;
    const existing = JSON.parse(localStorage.getItem("workouts") || "[]") as StoredWorkout[];
    const filtered = existing.filter((item) => item.id !== workoutId);
    localStorage.setItem("workouts", JSON.stringify(filtered));
  };

  const handleSave = async () => {
    if (!workoutMeta || saving) return;

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const exercisePayload = denormaliseExercises(exercises);

      if (user?.id) {
        const response = await fetch(`/api/workouts/${workoutMeta.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: workoutMeta.title.trim(),
            description: workoutMeta.description ?? null,
            exercises: exercisePayload,
            totalDuration: workoutMeta.totalDuration,
            difficulty: workoutMeta.difficulty,
            tags: workoutMeta.tags,
          }),
        });
        if (!response.ok) {
          throw new Error('Failed to save workout');
        }
        setSource("dynamodb");
      }

      const localPayload = buildLocalWorkoutPayload(
        { meta: workoutMeta, exercises } as EditableWorkoutState,
        exercises,
        exercisePayload
      );
      updateLocalCache(localPayload);

      initialSnapshotRef.current = createSnapshot(workoutMeta, exercises);
      setValidationErrors({});
      window.dispatchEvent(new Event("workoutsUpdated"));
      router.push(`/workout/${workoutMeta.id}`);
    } catch (error) {
      console.error("Failed to save workout:", error);
      alert("Failed to save workout changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!workoutMeta) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete this workout? This action cannot be undone."
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      if (user?.id) {
        const response = await fetch(`/api/workouts/${workoutMeta.id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          throw new Error('Failed to delete workout');
        }
      }
      removeFromLocalCache(workoutMeta.id);
      window.dispatchEvent(new Event("workoutsUpdated"));
      router.push("/library");
    } catch (error) {
      console.error("Failed to delete workout:", error);
      alert("Failed to delete workout. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return <Login />;
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex min-h-screen items-center justify-center bg-black">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </main>
      </>
    );
  }

  if (notFound || !workoutMeta) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-black py-20">
          <div className="mx-auto max-w-2xl px-4 text-center text-white">
            <h2 className="mb-2 text-2xl font-bold">Workout not found</h2>
            <p className="mb-6 text-white/60">
              The workout you&apos;re trying to edit could not be located. It may have been removed.
            </p>
            <Link href="/library">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Library
              </Button>
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-40 text-white">
        <div className="mx-auto w-full max-w-2xl px-4 pt-8">
          <div className="mb-6 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/workout/${workoutMeta.id}`)}
              className="h-10 w-10 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="text-center">
              <p className="text-[10px] uppercase tracking-[0.45em] text-white/40">
                {formatWorkoutDate(workoutMeta.createdAt)}
              </p>
              <p className="mt-1 text-sm text-white/50">
                {source === "dynamodb" ? "Synced workout" : "Local workout"}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleAddExercise}
              className="h-10 w-10 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          <div className="mb-6 rounded-2xl border border-slate-700/50 bg-slate-800/80 p-5 shadow-lg">
            <label className="mb-2 block text-xs uppercase tracking-wider text-slate-400">
              Workout Name
            </label>
            <Input
              value={workoutMeta.title}
              onChange={(event) => {
                setWorkoutMeta((prev) => (prev ? { ...prev, title: event.target.value } : prev));
                clearError("meta-title");
              }}
              placeholder="Give this workout a name"
              className={cn(
                "border-slate-600 bg-slate-900/80 text-lg font-semibold text-white placeholder:text-slate-400 focus:border-primary focus:ring-0",
                validationErrors["meta-title"] && "border-red-500 focus:border-red-500"
              )}
            />
            {validationErrors["meta-title"] && (
              <p className="mt-2 text-xs text-red-400">{validationErrors["meta-title"]}</p>
            )}

            <label className="mt-5 block text-xs uppercase tracking-wider text-slate-400">
              Description
            </label>
            <Textarea
              value={workoutMeta.description ?? ""}
              onChange={(event) =>
                setWorkoutMeta((prev) =>
                  prev ? { ...prev, description: event.target.value } : prev
                )
              }
              placeholder="Optional notes about this workout..."
              rows={3}
              className="resize-none border-slate-600 bg-slate-900/80 text-sm text-white placeholder:text-slate-400 focus:border-primary focus:ring-0"
            />

            {/* Timer Configuration */}
            <div className="mt-5 border-t border-slate-700/50 pt-5">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Timer className="h-3.5 w-3.5" />
                  Workout Timer
                </label>
                {workoutMeta.timerConfig?.aiGenerated && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    AI-Suggested
                  </Badge>
                )}
              </div>

              <Select
                value={workoutMeta.timerConfig ? "custom" : "none"}
                onValueChange={(value) => {
                  if (value === "none") {
                    setWorkoutMeta((prev) => prev ? { ...prev, timerConfig: null } : prev);
                  } else if (value !== "custom") {
                    // Find the template and set its params
                    const template = TIMER_TEMPLATES.find((t) => t.id === value);
                    if (template) {
                      setWorkoutMeta((prev) =>
                        prev
                          ? {
                              ...prev,
                              timerConfig: {
                                params: template.defaultParams,
                                aiGenerated: false,
                              },
                            }
                          : prev
                      );
                    }
                  }
                }}
              >
                <SelectTrigger className="border-slate-600 bg-slate-900/80 text-white focus:border-primary focus:ring-0">
                  <SelectValue placeholder="No timer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No timer</SelectItem>
                  {workoutMeta.timerConfig && (
                    <SelectItem value="custom">
                      {workoutMeta.timerConfig.aiGenerated ? "AI-Suggested Timer" : "Custom Timer"}
                    </SelectItem>
                  )}
                  {TIMER_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {workoutMeta.timerConfig?.reason && (
                <p className="mt-2 text-xs text-slate-400 italic">
                  {workoutMeta.timerConfig.reason}
                </p>
              )}

              {workoutMeta.timerConfig && (
                <div className="mt-3 rounded-lg border border-slate-700/50 bg-slate-900/60 p-3">
                  <p className="text-xs text-slate-400 mb-2">Timer Details:</p>
                  <pre className="text-xs text-slate-300 overflow-x-auto">
                    {JSON.stringify(workoutMeta.timerConfig.params, null, 2)}
                  </pre>
                  {!workoutMeta.timerConfig.aiGenerated && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setWorkoutMeta((prev) => prev ? { ...prev, timerConfig: null } : prev)}
                      className="mt-2 w-full text-xs text-slate-400 hover:text-red-400"
                    >
                      Remove Timer
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {exercises.map((exercise, index) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              index={index}
              validationErrors={validationErrors}
              onNameChange={(value) => handleExerciseNameChange(exercise.id, value)}
              onSetChange={(setId, field, value) => handleSetChange(exercise.id, setId, field, value)}
              onRemoveSet={(setId) => handleRemoveSet(exercise.id, setId)}
              onAddSet={() => handleAddSet(exercise.id)}
              onRemoveExercise={() => handleRemoveExercise(exercise.id)}
            />
          ))}

          <div className="mt-4 flex justify-center">
            <Button
              variant="ghost"
              onClick={handleAddExercise}
              className="rounded-xl border border-dashed border-slate-600 bg-transparent px-6 py-3 text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Movement
            </Button>
          </div>

          <div className="mt-10">
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={saving}
              className="w-full rounded-full border-red-500/20 bg-transparent text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Workout
            </Button>
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-3xl px-4 pb-6">
        <Button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="h-14 w-full rounded-full bg-primary text-lg font-semibold shadow-lg shadow-primary/40 transition disabled:bg-white/20 disabled:text-white/40"
        >
          {saving ? (
            <span className="flex items-center gap-2 text-white">
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Save Changes
            </span>
          )}
        </Button>
      </div>
      <MobileNav />
    </>
  );
}
