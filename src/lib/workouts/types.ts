import type { DynamoDBExercise, DynamoDBWorkout } from "../dynamodb";

export interface EditableSet {
  id: string;
  reps: string;
  weight: string;
}

export interface EditableExercise {
  id: string;
  name: string;
  notes?: string | null;
  restSeconds?: number | null;
  setDetails: EditableSet[];
}

export interface EditableWorkoutMeta {
  id: string;
  title: string;
  description?: string | null;
  createdAt: string;
  content: string;
  source: string;
  type: string;
  totalDuration: number;
  difficulty: string;
  tags: string[];
  author?: { username: string } | null;
  llmData?: unknown;
  imageUrls?: string[];
  thumbnailUrl?: string | null;
  scheduledDate?: string | null;
  status?: DynamoDBWorkout["status"];
  completedDate?: string | null;
}

export interface EditableWorkoutState {
  meta: EditableWorkoutMeta;
  exercises: EditableExercise[];
}

export interface SetDetail {
  id?: string;
  reps?: string | number | null;
  weight?: string | number | null;
}

export interface ExtendedDynamoDBExercise extends DynamoDBExercise {
  setDetails?: SetDetail[] | null;
}

type StoredWorkout = {
  id: string;
  title: string;
  description?: string | null;
  exercises: Array<ExtendedDynamoDBExercise>;
  content: string;
  author?: { username: string } | null;
  createdAt: string;
  updatedAt?: string;
  source: string;
  type: string;
  totalDuration: number;
  difficulty: string;
  tags: string[];
  llmData?: unknown;
  imageUrls?: string[];
  thumbnailUrl?: string | null;
  scheduledDate?: string | null;
  status?: DynamoDBWorkout["status"];
  completedDate?: string | null;
};

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const coerceString = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return "";
  return typeof value === "number" ? String(value) : value;
};

const normaliseSetDetails = (
  exercise: ExtendedDynamoDBExercise
): EditableSet[] => {
  const details = exercise.setDetails?.length
    ? exercise.setDetails
    : Array.from({
        length: exercise.sets && exercise.sets > 0 ? exercise.sets : 1,
      }).map(() => ({
        reps: exercise.reps,
        weight: exercise.weight,
      }));

  return details.map((detail) => ({
    id: detail?.id ?? generateId(),
    reps: coerceString(detail?.reps ?? exercise.reps ?? ""),
    weight: coerceString(detail?.weight ?? exercise.weight ?? ""),
  }));
};

export const normaliseWorkoutForEditing = (
  workout: DynamoDBWorkout | StoredWorkout
): EditableWorkoutState => {
  const meta: EditableWorkoutMeta = {
    id: "workoutId" in workout ? workout.workoutId : workout.id,
    title: workout.title ?? "",
    description: workout.description ?? "",
    createdAt: workout.createdAt,
    content: workout.content,
    source: workout.source,
    type: workout.type,
    totalDuration: workout.totalDuration,
    difficulty: workout.difficulty,
    tags: Array.isArray(workout.tags) ? workout.tags : [],
    author: workout.author ?? null,
    llmData: workout.llmData,
    imageUrls: workout.imageUrls,
    thumbnailUrl: workout.thumbnailUrl ?? null,
    scheduledDate: workout.scheduledDate ?? null,
    status: workout.status ?? null,
    completedDate: workout.completedDate ?? null,
  };

  const exercises: EditableExercise[] = (workout.exercises || []).map(
    (exercise) => ({
      id: exercise.id ?? generateId(),
      name: exercise.name ?? "",
      notes: exercise.notes ?? null,
      restSeconds:
        typeof exercise.restSeconds === "number"
          ? exercise.restSeconds
          : exercise.restSeconds
          ? Number(exercise.restSeconds)
          : null,
      setDetails: normaliseSetDetails(exercise),
    })
  );

  if (!exercises.length) {
    exercises.push({
      id: generateId(),
      name: "",
      notes: null,
      restSeconds: null,
      setDetails: [
        {
          id: generateId(),
          reps: "",
          weight: "",
        },
      ],
    });
  }

  return { meta, exercises };
};

const summariseValues = (values: string[]): string | null => {
  const cleaned = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (!cleaned.length) return null;

  const unique = Array.from(new Set(cleaned));
  return unique.length === 1 ? unique[0] : unique.join(" / ");
};

export const denormaliseExercises = (
  exercises: EditableExercise[]
): ExtendedDynamoDBExercise[] =>
  exercises.map((exercise) => {
    const setDetails = exercise.setDetails.map((set) => ({
      id: set.id,
      reps: set.reps.trim() || null,
      weight: set.weight.trim() || null,
    }));

    const repsSummary = summariseValues(
      exercise.setDetails.map((set) => set.reps)
    );
    const weightSummary = summariseValues(
      exercise.setDetails.map((set) => set.weight)
    );

    return {
      id: exercise.id,
      name: exercise.name.trim(),
      notes: exercise.notes?.trim() || null,
      restSeconds:
        typeof exercise.restSeconds === "number" && !Number.isNaN(exercise.restSeconds)
          ? exercise.restSeconds
          : null,
      sets: exercise.setDetails.length || 1,
      reps: repsSummary ?? "",
      weight: weightSummary,
      setDetails,
    };
  });

export const buildPersistableWorkout = (
  state: EditableWorkoutState,
  exercises: EditableExercise[],
  original: DynamoDBWorkout | StoredWorkout
): DynamoDBWorkout => {
  const persistableExercises = denormaliseExercises(exercises);

  return {
    userId: (original as DynamoDBWorkout).userId ?? "",
    workoutId: state.meta.id,
    title: state.meta.title.trim(),
    description: state.meta.description ?? null,
    exercises: persistableExercises,
    content: state.meta.content,
    author: state.meta.author ?? null,
    createdAt: state.meta.createdAt,
    updatedAt:
      "updatedAt" in original && original.updatedAt
        ? original.updatedAt
        : new Date().toISOString(),
    source: state.meta.source,
    type: state.meta.type,
    totalDuration: state.meta.totalDuration,
    difficulty: state.meta.difficulty,
    tags: state.meta.tags,
    llmData: state.meta.llmData ?? null,
    imageUrls: state.meta.imageUrls,
    thumbnailUrl: state.meta.thumbnailUrl ?? null,
    scheduledDate: state.meta.scheduledDate ?? null,
    status: state.meta.status ?? null,
    completedDate: state.meta.completedDate ?? null,
  };
};

export const buildLocalWorkoutPayload = (
  state: EditableWorkoutState,
  exercises: EditableExercise[],
  precomputedExercises?: ExtendedDynamoDBExercise[]
): StoredWorkout => {
  const exercisePayload = precomputedExercises ?? denormaliseExercises(exercises);

  return {
    id: state.meta.id,
    title: state.meta.title.trim(),
    description: state.meta.description ?? null,
    exercises: exercisePayload,
    content: state.meta.content,
    author: state.meta.author ?? null,
    createdAt: state.meta.createdAt,
    updatedAt: new Date().toISOString(),
    source: state.meta.source,
    type: state.meta.type,
    totalDuration: state.meta.totalDuration,
    difficulty: state.meta.difficulty,
    tags: state.meta.tags,
    llmData: state.meta.llmData,
    imageUrls: state.meta.imageUrls,
    thumbnailUrl: state.meta.thumbnailUrl ?? null,
    scheduledDate: state.meta.scheduledDate ?? null,
    status: state.meta.status ?? null,
    completedDate: state.meta.completedDate ?? null,
  };
};

export type { StoredWorkout };
