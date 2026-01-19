import {
  assessParseConfidence,
  parseWorkoutContent,
  type ParsedExercise,
  type ParsedWorkoutResult,
  type WorkoutStructure,
  type WorkoutType,
} from "@/lib/smartWorkoutParser";
import { organizeWorkoutContent } from "@/lib/ai/workout-content-organizer";
import { structureWorkout, type TrainingContext, type WorkoutData } from "@/lib/ai/workout-enhancer";

const DEFAULT_MIN_CONFIDENCE = 0.5;

export interface ParsedWorkoutWithMeta extends ParsedWorkoutResult {
  confidence: number;
  usedLLM: boolean;
  source: "heuristic" | "llm";
}

export interface ParseWorkoutOptions {
  minConfidence?: number;
  context?: TrainingContext;
}

export async function parseWorkoutContentWithFallback(
  caption: string,
  options: ParseWorkoutOptions = {}
): Promise<ParsedWorkoutWithMeta> {
  const heuristic = parseWorkoutContent(caption);
  const confidence = assessParseConfidence(caption, heuristic);
  const minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE;

  if (confidence >= minConfidence && heuristic.exercises.length > 0) {
    return { ...heuristic, confidence, usedLLM: false, source: "heuristic" };
  }

  try {
    const organized = await organizeWorkoutContent(caption);
    const structured = await structureWorkout(organized.organized, options.context, { model: "haiku" });
    const aiParsed = mapAiWorkoutToParsed(structured.enhancedWorkout, heuristic.title);
    const aiConfidence = Math.max(confidence, 0.6);
    return { ...aiParsed, confidence: aiConfidence, usedLLM: true, source: "llm" };
  } catch (error) {
    console.error("[WorkoutParser] AI fallback failed:", error);
    return { ...heuristic, confidence, usedLLM: false, source: "heuristic" };
  }
}

function mapAiWorkoutToParsed(data: WorkoutData, fallbackTitle?: string): ParsedWorkoutResult {
  const workoutType = coerceWorkoutType(data.workoutType);
  const structure: WorkoutStructure = { type: workoutType };
  const rawWorkoutType = data.workoutType ? String(data.workoutType).toLowerCase() : "";

  if (data.structure) {
    if (data.structure.rounds !== undefined) structure.rounds = Number(data.structure.rounds);
    if (data.structure.timePerRound !== undefined) structure.timePerRound = data.structure.timePerRound;
    if (data.structure.timeLimit !== undefined) structure.timeLimit = data.structure.timeLimit;
    if (data.structure.totalTime !== undefined) structure.totalTime = data.structure.totalTime;
    if (data.structure.pattern) {
      structure.pattern = data.structure.pattern;
      const ladderValues = parseLadderValues(data.structure.pattern);
      if (ladderValues) structure.values = ladderValues;
    }
  }

  if (workoutType === "ladder" && !structure.values && structure.pattern) {
    const ladderValues = parseLadderValues(structure.pattern);
    if (ladderValues) structure.values = ladderValues;
  }

  if (workoutType === "standard" && (/\bfor time\b/i.test(rawWorkoutType) || (data.description && /\bfor time\b/i.test(data.description)))) {
    structure.forTime = true;
  }

  const exercises: ParsedExercise[] = (data.exercises || []).map((exercise, index) => {
    const repsText = normalizeReps(exercise.reps, exercise.duration);
    const unit = inferUnit(repsText, exercise.duration);
    const sets = coerceSets(exercise.sets);
    const weight = exercise.weight ? String(exercise.weight).trim() : "";
    const notes = exercise.notes ? exercise.notes.trim() : "";

    const parsedExercise: ParsedExercise = {
      id: `ai-ex-${Date.now()}-${index}`,
      name: exercise.name || `Exercise ${index + 1}`,
      unit,
      sets,
      reps: repsText,
      weight,
      restSeconds: exercise.restSeconds ?? 60,
      notes: notes || undefined,
    };

    if (unit === "meters" && repsText) {
      parsedExercise.distance = repsText;
    }
    if (unit === "time" && repsText) {
      parsedExercise.timing = repsText;
    }

    return parsedExercise;
  });

  const summary = buildSummary(exercises, structure);
  const breakdown = buildBreakdown(exercises, structure);

  return {
    title: data.title || fallbackTitle,
    workoutType,
    exercises,
    structure,
    summary,
    breakdown,
  };
}

function coerceWorkoutType(value?: WorkoutData["workoutType"] | string): WorkoutType {
  if (!value) return "standard";
  const normalized = String(value).toLowerCase().replace(/\s+/g, "");
  switch (normalized) {
    case "emom":
    case "amrap":
    case "rounds":
    case "ladder":
    case "tabata":
    case "standard":
      return normalized as WorkoutType;
    case "fortime":
    case "for-time":
      return "standard";
    default:
      return "standard";
  }
}

function coerceSets(value?: number | string): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 1;
}

function normalizeReps(reps?: number | string, duration?: number): string {
  if (reps !== undefined && reps !== null && String(reps).trim().length > 0) {
    return String(reps).trim();
  }
  if (duration && Number.isFinite(duration)) {
    return formatDuration(duration);
  }
  return "";
}

function inferUnit(repsText: string, duration?: number): string {
  if (duration && Number.isFinite(duration)) return "time";
  const lower = repsText.toLowerCase();
  if (/\b(cal|cals|calories)\b/.test(lower)) return "calories";
  if (/\b\d+(?:\.\d+)?\s*(?:m|meter|meters|metres|km)\b/.test(lower)) return "meters";
  if (/\b(min|mins|minute|minutes|sec|secs|second|seconds)\b/.test(lower) || /\d+:\d{2}/.test(lower)) {
    return "time";
  }
  return "reps";
}

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  if (minutes > 0) {
    return `${minutes}:${remainder.toString().padStart(2, "0")}`;
  }
  return `${safeSeconds} sec`;
}

function parseLadderValues(pattern: string): number[] | undefined {
  const values = pattern
    .split(/[-/]/)
    .map((value) => parseInt(value, 10))
    .filter((value) => !Number.isNaN(value));
  return values.length > 0 ? values : undefined;
}

function formatDurationMinutes(seconds?: number): string | null {
  if (!seconds || seconds <= 0) return null;
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

function buildSummary(exercises: ParsedExercise[], structure: WorkoutStructure): string {
  const exerciseCount = exercises.length;

  switch (structure.type) {
    case "ladder": {
      const rounds = structure.values?.length || 0;
      return `Ladder workout with ${exerciseCount} exercises, ${rounds} descending rounds.`;
    }
    case "rounds":
      return `${structure.rounds || 0} rounds of ${exerciseCount} exercises.`;
    case "amrap": {
      const duration = formatDurationMinutes(structure.timeLimit);
      return duration
        ? `AMRAP ${duration} with ${exerciseCount} exercises.`
        : `AMRAP workout with ${exerciseCount} exercises.`;
    }
    case "emom": {
      const totalTime = structure.totalTime || (structure.rounds && structure.timePerRound
        ? structure.rounds * structure.timePerRound
        : undefined);
      const duration = formatDurationMinutes(totalTime);
      return duration
        ? `EMOM ${duration} with ${exerciseCount} exercises.`
        : `EMOM workout with ${exerciseCount} exercises.`;
    }
    case "tabata":
      return `Tabata workout (8 rounds, 20s on/10s off) with ${exerciseCount} exercises.`;
    default:
      return structure.forTime
        ? `For Time workout with ${exerciseCount} exercises.`
        : `Workout with ${exerciseCount} exercises.`;
  }
}

function buildBreakdown(exercises: ParsedExercise[], structure: WorkoutStructure): string[] {
  if (structure.type === "ladder" && structure.values) {
    const ladderLines = exercises.map((ex) => `${ex.name}: ${structure.values?.map((v) => `${v} ${ex.unit}`).join(", ")}`);
    return [`Ladder format: ${structure.values.join("-")}`, ...ladderLines];
  }

  return exercises.map((ex) => {
    let line = ex.name;
    if (ex.reps) line += ` - ${ex.reps}`;
    if (ex.weight) line += ` @ ${ex.weight}`;
    return line;
  });
}
