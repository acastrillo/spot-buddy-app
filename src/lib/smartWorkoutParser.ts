// Smart workout parser that understands exercise types, structures, and units
import glossary from "../../data/spotter_glossary.json";
import exercisesData from "./knowledge-base/exercises.json";
import { matchExercise } from "./knowledge-base/exercise-matcher";

export type WorkoutType =
  | "standard"
  | "emom"
  | "amrap"
  | "rounds"
  | "ladder"
  | "tabata";

interface ExerciseInfo {
  defaultUnit: string;
  altUnits?: string[];
  defaultWeight?: string;
  category?: "cardio" | "strength" | "movement" | "time";
  notes?: string;
}

export interface WorkoutStructure {
  type: WorkoutType;
  values?: number[];
  rounds?: number;
  timeLimit?: number; // seconds
  timePerRound?: number; // seconds
  totalTime?: number; // seconds
  pattern?: string;
  workSeconds?: number;
  restSeconds?: number;
  amrapBlocks?: AMRAPBlockInfo[];
  forTime?: boolean;
}

export interface AMRAPBlockInfo {
  id: string;
  label: string;
  timeLimit: number;
  order: number;
  startLine: number;
  endLine?: number;
}

export interface ParsedAMRAPBlock {
  id: string;
  label: string;
  timeLimit: number;
  order: number;
  exercises: ParsedExercise[];
}

export interface ParsedEMOMBlock {
  id: string;
  label: string;
  intervalSeconds: number;
  order: number;
  exercises: ParsedExercise[];
}

export interface ParsedExercise {
  id: string;
  name: string;
  unit: string;
  values?: number[];
  sets?: number;
  reps?: string;
  weight?: string;
  restSeconds?: number;
  notes?: string;
  distance?: string | null;
  timing?: string | null;
}

export interface ParsedWorkoutResult {
  title?: string;
  workoutType: WorkoutType;
  exercises: ParsedExercise[];
  structure: WorkoutStructure;
  summary: string;
  breakdown: string[];
  amrapBlocks?: ParsedAMRAPBlock[];
  emomBlocks?: ParsedEMOMBlock[];
}

interface MovementMatcher {
  canonical: string;
  alias: string;
  aliasLength: number;
  regex: RegExp;
}

interface RepDetails {
  repsText: string;
  sets: number;
  values?: number[];
  primaryUnit?: string;
  notes?: string[];
}

interface WeightDetails {
  weight?: string;
  notes?: string[];
}

interface LineEntry {
  text: string;
  index: number;
}

interface KnowledgeBaseExercise {
  canonical: string;
  aliases: string[];
  category: string;
  equipment: string[];
}

// Exercise database with common movements and their typical units
const exerciseInfoOverrides: Record<string, ExerciseInfo> = {
  // Monostructural cardio
  row: { defaultUnit: "calories", altUnits: ["meters", "time"], category: "cardio" },
  rower: { defaultUnit: "calories", altUnits: ["meters", "time"], category: "cardio" },
  "rowing machine": { defaultUnit: "calories", altUnits: ["meters", "time"], category: "cardio" },
  bike: { defaultUnit: "calories", altUnits: ["meters", "time"], category: "cardio" },
  "air bike": { defaultUnit: "calories", altUnits: ["meters", "time"], category: "cardio" },
  "assault bike": { defaultUnit: "calories", altUnits: ["meters", "time"], category: "cardio" },
  "echo bike": { defaultUnit: "calories", altUnits: ["meters", "time"], category: "cardio" },
  run: { defaultUnit: "meters", altUnits: ["time"], category: "cardio" },
  ski: { defaultUnit: "calories", altUnits: ["meters", "time"], category: "cardio" },
  "ski erg": { defaultUnit: "calories", altUnits: ["meters", "time"], category: "cardio" },
  "bike erg": { defaultUnit: "calories", altUnits: ["meters", "time"], category: "cardio" },
  running: { defaultUnit: "meters", altUnits: ["time"], category: "cardio" },
  biking: { defaultUnit: "calories", altUnits: ["meters"], category: "cardio" },
  rowing: { defaultUnit: "calories", altUnits: ["meters", "time"], category: "cardio" },

  // Bodyweight movements
  burpee: { defaultUnit: "reps", category: "movement" },
  burpees: { defaultUnit: "reps", category: "movement" },
  "burpee box jump": { defaultUnit: "reps", category: "movement" },
  "push-up": { defaultUnit: "reps", category: "movement" },
  "push ups": { defaultUnit: "reps", category: "movement" },
  "push-ups": { defaultUnit: "reps", category: "movement" },
  "pull-up": { defaultUnit: "reps", category: "movement" },
  "pull ups": { defaultUnit: "reps", category: "movement" },
  "pull-ups": { defaultUnit: "reps", category: "movement" },
  squat: { defaultUnit: "reps", category: "movement" },
  "air squats": { defaultUnit: "reps", category: "movement" },
  "jump squats": { defaultUnit: "reps", category: "movement" },
  "mountain climber": { defaultUnit: "reps", category: "movement" },
  "mountain climbers": { defaultUnit: "reps", category: "movement" },
  "jumping jacks": { defaultUnit: "reps", category: "movement" },
  "sit-up": { defaultUnit: "reps", category: "movement" },
  "sit ups": { defaultUnit: "reps", category: "movement" },
  crunches: { defaultUnit: "reps", category: "movement" },
  plank: { defaultUnit: "time", category: "time" },
  "side plank": { defaultUnit: "time", category: "time" },
  "handstand walk": { defaultUnit: "meters", altUnits: ["time"], category: "movement" },
  "handstand push-up": { defaultUnit: "reps", category: "movement" },
  "toes to bar": { defaultUnit: "reps", category: "movement" },
  "muscle up": { defaultUnit: "reps", category: "movement" },
  "russian twist": { defaultUnit: "reps", category: "movement" },
  "v-up": { defaultUnit: "reps", category: "movement" },
  lunge: { defaultUnit: "reps", altUnits: ["meters"], category: "movement" },
  "walking lunge": { defaultUnit: "meters", altUnits: ["reps"], category: "movement" },
  "bear crawl": { defaultUnit: "meters", category: "movement" },
  hop: { defaultUnit: "reps", category: "movement" },

  // Weighted movements
  "wall ball": { defaultUnit: "reps", defaultWeight: "20 lb", category: "strength" },
  thruster: { defaultUnit: "reps", defaultWeight: "95 lb", category: "strength" },
  deadlift: { defaultUnit: "reps", defaultWeight: "135 lb", category: "strength" },
  "back squat": { defaultUnit: "reps", defaultWeight: "135 lb", category: "strength" },
  "front squat": { defaultUnit: "reps", defaultWeight: "95 lb", category: "strength" },
  "overhead press": { defaultUnit: "reps", defaultWeight: "65 lb", category: "strength" },
  "push press": { defaultUnit: "reps", defaultWeight: "95 lb", category: "strength" },
  "shoulder to overhead": { defaultUnit: "reps", defaultWeight: "95 lb", category: "strength" },
  "bench press": { defaultUnit: "reps", defaultWeight: "135 lb", category: "strength" },
  "overhead squat": { defaultUnit: "reps", defaultWeight: "95 lb", category: "strength" },
  "squat clean": { defaultUnit: "reps", defaultWeight: "135 lb", category: "strength" },
  "hang clean": { defaultUnit: "reps", defaultWeight: "135 lb", category: "strength" },
  "clean and jerk": { defaultUnit: "reps", defaultWeight: "135 lb", category: "strength" },
  snatch: { defaultUnit: "reps", defaultWeight: "95 lb", category: "strength" },
  "hang snatch": { defaultUnit: "reps", defaultWeight: "95 lb", category: "strength" },
  "devil press": { defaultUnit: "reps", defaultWeight: "2 x 35 lb", category: "strength" },

  // Distance/carry movements
  "sled pull": { defaultUnit: "meters", category: "movement" },
  "sled push": { defaultUnit: "meters", category: "movement" },
  "farmer carry": { defaultUnit: "meters", defaultWeight: "50 lb each", category: "movement" },
  "farmer hold": { defaultUnit: "time", defaultWeight: "50 lb each", category: "movement" },
  "walking lunges": { defaultUnit: "meters", altUnits: ["reps"], category: "movement" },
  "crab walk": { defaultUnit: "meters", category: "movement" },

  // Box/jump movements
  "box jump": { defaultUnit: "reps", notes: "24\" box", category: "movement" },
  "box step-up": { defaultUnit: "reps", notes: "20\" box", category: "movement" },
  "step-up": { defaultUnit: "reps", notes: "20\" box", category: "movement" },
  "jump rope": { defaultUnit: "reps", altUnits: ["time"], category: "cardio" },
  "double under": { defaultUnit: "reps", category: "cardio" },
  "single under": { defaultUnit: "reps", category: "cardio" },

  // Kettlebell movements
  "kettlebell swing": { defaultUnit: "reps", defaultWeight: "53 lb", category: "strength" },
  "kettlebell swings": { defaultUnit: "reps", defaultWeight: "53 lb", category: "strength" },
  "kettlebell snatch": { defaultUnit: "reps", defaultWeight: "53 lb", category: "strength" },
  "kettlebell snatches": { defaultUnit: "reps", defaultWeight: "53 lb", category: "strength" },
};

const knowledgeBaseExercises: KnowledgeBaseExercise[] =
  (exercisesData as { exercises?: KnowledgeBaseExercise[] }).exercises || [];

const knowledgeBaseMap = new Map<string, KnowledgeBaseExercise>();
knowledgeBaseExercises.forEach((exercise) => {
  knowledgeBaseMap.set(exercise.canonical.toLowerCase(), exercise);
});

const movementMatchers = buildMovementMatchers();
const protectedAndPhrases = buildProtectedAndPhrases(movementMatchers);

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildMovementMatchers(): MovementMatcher[] {
  const sources: Array<{ canonical: string; aliases: string[] }> = [];
  const glossaryMovements = (glossary as any).movements || {};

  Object.entries(glossaryMovements).forEach(([canonical, aliases]) => {
    const names = [canonical, ...(aliases as string[])].filter(Boolean);
    sources.push({ canonical, aliases: names });
  });

  knowledgeBaseExercises.forEach((exercise) => {
    sources.push({ canonical: exercise.canonical, aliases: [exercise.canonical, ...exercise.aliases] });
  });

  const seen = new Set<string>();
  const matchers: MovementMatcher[] = [];

  sources.forEach((source) => {
    const uniqueAliases = Array.from(new Set(source.aliases.map((alias) => alias.trim()).filter(Boolean)));
    uniqueAliases.forEach((alias) => {
      const normalized = alias.toLowerCase();
      if (!normalized) return;
      const key = `${source.canonical.toLowerCase()}::${normalized}`;
      if (seen.has(key)) return;
      seen.add(key);
      matchers.push({
        canonical: source.canonical,
        alias: normalized,
        aliasLength: normalized.length,
        regex: new RegExp(`\\b${escapeRegExp(normalized)}\\b`, "i"),
      });
    });
  });

  return matchers.sort((a, b) => b.aliasLength - a.aliasLength);
}

function buildProtectedAndPhrases(matchers: MovementMatcher[]): string[] {
  const phrases = new Set<string>();
  matchers.forEach((matcher) => {
    if (matcher.alias.includes(" and ")) {
      phrases.add(matcher.alias);
    }
  });
  return Array.from(phrases.values());
}

const KEYCAP_DIGIT_REGEX = /(\d)\uFE0F?\u20E3/g;
const CIRCLED_DIGIT_REGEX = /[\u2460-\u2468]/g;
const CIRCLED_DIGIT_MAP: Record<string, string> = {
  "\u2460": "1",
  "\u2461": "2",
  "\u2462": "3",
  "\u2463": "4",
  "\u2464": "5",
  "\u2465": "6",
  "\u2466": "7",
  "\u2467": "8",
  "\u2468": "9",
};
const BULLET_SPLIT_REGEX = /\s*[\u2022\u25CF\u25CB\u25AA\u25AB\u25E6]\s*/g;

function normalizeCaption(caption: string): string {
  return caption
    .replace(KEYCAP_DIGIT_REGEX, "$1")
    .replace(CIRCLED_DIGIT_REGEX, (match) => CIRCLED_DIGIT_MAP[match] || match)
    .replace(BULLET_SPLIT_REGEX, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00d7/g, "x")
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u2032/g, "'")
    .replace(/\u2033/g, '"')
    .replace(/\t/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function normalizeLine(line: string): string {
  return line
    .replace(/\u00d7/g, "x")
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

const BULLET_PREFIX = /^[\s>*\-\u2022\u25CF\u25E6]+/;

function stripLinePrefix(line: string): string {
  let cleaned = line.replace(BULLET_PREFIX, "");
  const lower = cleaned.toLowerCase();
  const preserveNumbering = /\b(amrap|emom|tabata|for time|interval|e\d+mom)\b/.test(lower);
  if (!preserveNumbering) {
    cleaned = cleaned.replace(/^\(?\d+\)?[.)\-:]\s+/, "");
    cleaned = cleaned.replace(/^[A-Za-z]\d{0,2}[.)\-:]\s+/, "");
  }
  return cleaned.trim();
}

function isNoiseLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("#") || trimmed.startsWith("@")) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/\b(follow|save|tag|share|like|comment|subscribe|link in bio|dm\b|swipe)\b/i.test(trimmed)) {
    return true;
  }
  if (!/[a-zA-Z0-9]/.test(trimmed)) return true;
  if (trimmed.toUpperCase().includes("WORKOUT DETAILS")) return true;
  return false;
}

function isStructureLine(line: string): boolean {
  const lower = line.toLowerCase();
  if (/\b(amrap|emom|for time|rft|tabata|interval|every minute|e\d+mom)\b/.test(lower)) return true;
  if (/\bevery\s*\d+:\d{2}\b/.test(lower)) return true;
  if (/\bevery\s*\d+\s*(?:min|mins|minutes|m\b|sec|secs|seconds|s\b)\b/.test(lower)) return true;
  if (/\b\d+\s*(?:rounds?|rds)\b/.test(lower)) return true;
  if (/\b\d+(?:[-/]\d+){2,}\b/.test(lower)) return true;
  if (/\b\d+\s*(?:min|mins|minutes|sec|secs|seconds)\b/.test(lower) && /\b(amrap|emom)\b/.test(lower)) {
    return true;
  }
  return false;
}

function findExactMovement(text: string): string | null {
  const lower = text.toLowerCase();
  for (const matcher of movementMatchers) {
    if (matcher.regex.test(lower)) {
      return matcher.canonical;
    }
  }
  return null;
}

function detectWorkoutTitle(lines: LineEntry[]): { title?: string; index?: number } {
  const candidates = lines.slice(0, 6);
  for (const entry of candidates) {
    const line = entry.text;
    if (!line) continue;
    if (isNoiseLine(line)) continue;
    if (isStructureLine(line)) continue;
    if (findExactMovement(line)) continue;
    if (line.length > 80) continue;
    if (/\d/.test(line) && !/\b(wod|day|week|workout)\b/i.test(line)) continue;

    const cleaned = line.replace(/^(workout|wod|training|session|day)\s*[:\-]\s*/i, "").trim();
    if (cleaned.length < 3) continue;
    return { title: cleaned, index: entry.index };
  }
  return {};
}

/**
 * Parse time limit from various AMRAP formats
 * Supports: "20", "20 min", "20 minutes", "90 sec", "90 seconds", "10:30"
 */
function parseTimeLimit(timeStr: string): number | null {
  const lower = timeStr.toLowerCase().trim();

  const timeFormatMatch = lower.match(/(\d+):(\d+)/);
  if (timeFormatMatch) {
    const minutes = parseInt(timeFormatMatch[1], 10);
    const seconds = parseInt(timeFormatMatch[2], 10);
    return minutes * 60 + seconds;
  }

  const secondsMatch = lower.match(/(\d+)\s*(?:sec|secs|second|seconds|s\b|")/);
  if (secondsMatch) {
    return parseInt(secondsMatch[1], 10);
  }

  const minutesMatch = lower.match(/(\d+)\s*(?:min|mins|minute|minutes|m\b|')/);
  if (minutesMatch) {
    return parseInt(minutesMatch[1], 10) * 60;
  }

  const bare = lower.match(/\b(\d+)\b/);
  if (bare) {
    return parseInt(bare[1], 10) * 60;
  }

  return null;
}

function detectAMRAPBlocks(lines: string[]): AMRAPBlockInfo[] {
  const blocks: AMRAPBlockInfo[] = [];

  const amrapPatterns: Array<{ regex: RegExp; label: "part" | "block" | "none" }> = [
    { regex: /(?:part|section)\s*([a-z])[:\-\s]*amrap\s*(?:for|in)?\s*(.+)/i, label: "part" },
    { regex: /(?:block|round)\s*(\d+)[:\-\s]*amrap\s*(?:for|in)?\s*(.+)/i, label: "block" },
    { regex: /(?:^|\s)(\d+)\s*[:\-\)\.]?\s*amrap\s*(?:for|in)?\s*(.+)/i, label: "block" },
    { regex: /amrap\s*(?:for|in)?\s*([\d:]+(?:\s*(?:min|mins|minutes|m\b|'))?)/i, label: "none" },
    { regex: /(\d+\s*(?:min|mins|minutes|m\b|'))\s*amrap/i, label: "none" },
  ];

  lines.forEach((line, lineIndex) => {
    for (const pattern of amrapPatterns) {
      const match = line.match(pattern.regex);
      if (!match) continue;

      let label = "AMRAP";
      let timeStr = "";

      if (pattern.label === "part") {
        label = `Part ${match[1].toUpperCase()}`;
        timeStr = match[2] || "";
      } else if (pattern.label === "block") {
        label = `Block ${match[1]}`;
        timeStr = match[2] || "";
      } else {
        timeStr = match[1] || match[2] || "";
      }

      const timeLimit = parseTimeLimit(timeStr);
      if (timeLimit) {
        blocks.push({
          id: `block-${blocks.length + 1}`,
          label: label || `Block ${blocks.length + 1}`,
          timeLimit,
          order: blocks.length + 1,
          startLine: lineIndex,
        });
        break;
      }
    }
  });

  for (let i = 0; i < blocks.length - 1; i++) {
    blocks[i].endLine = blocks[i + 1].startLine - 1;
  }
  if (blocks.length > 0) {
    blocks[blocks.length - 1].endLine = lines.length - 1;
  }

  return blocks;
}

function detectEMOMDetails(text: string): { intervalMinutes: number; rounds?: number; totalMinutes?: number } | null {
  const lower = text.toLowerCase();
  if (!/\bemom\b|\be\d+mom\b|every minute|every\s*\d+[:\d]*\b/.test(lower)) return null;

  let intervalMinutes = 1;
  const intervalMatch = lower.match(/\be(\d+(?:\.\d+)?)mom\b/);
  if (intervalMatch) {
    intervalMinutes = parseFloat(intervalMatch[1]);
  } else {
    const everyTimeMatch = lower.match(/every\s*(\d+):(\d{2})/);
    if (everyTimeMatch) {
      intervalMinutes = parseInt(everyTimeMatch[1], 10) + parseInt(everyTimeMatch[2], 10) / 60;
    }

    const everySecondsMatch = lower.match(/every\s*(\d+)\s*(?:sec|secs|seconds|s\b)/);
    if (everySecondsMatch) {
      intervalMinutes = parseInt(everySecondsMatch[1], 10) / 60;
    }

    const everyMatch = lower.match(/every\s*(\d+)?\s*(?:minutes?|mins?|min\b|m\b)/);
    if (everyMatch && everyMatch[1]) {
      intervalMinutes = parseInt(everyMatch[1], 10);
    }
  }

  let totalMinutes: number | undefined;
  let rounds: number | undefined;

  const eMomRoundsMatch = lower.match(/\be\d+mom\s*x\s*(\d+)/);
  if (eMomRoundsMatch) {
    rounds = parseInt(eMomRoundsMatch[1], 10);
  }

  const eMomTimeMatch = lower.match(/\be\d+mom\s*(\d+)\s*(?:min|mins|minutes|m\b|')/);
  if (eMomTimeMatch) {
    totalMinutes = parseInt(eMomTimeMatch[1], 10);
  }

  const emomTimeMatch = lower.match(/emom\s*(?:for|x)?\s*(\d+)\s*(?:min|mins|minutes|m\b|')/);
  if (emomTimeMatch) {
    totalMinutes = parseInt(emomTimeMatch[1], 10);
  }

  const forTimeMatch = lower.match(/every\s*(?:\d+\s*)?minutes?\s*for\s*(\d+)\s*(?:min|mins|minutes|m\b|')/);
  if (!totalMinutes && forTimeMatch) {
    totalMinutes = parseInt(forTimeMatch[1], 10);
  }

  const roundsMatch = lower.match(/(\d+)\s*(?:rounds?|rds|sets)\b/);
  if (roundsMatch) {
    rounds = parseInt(roundsMatch[1], 10);
  }

  const emomRoundsMatch = lower.match(/emom\s*x\s*(\d+)/);
  if (!rounds && emomRoundsMatch) {
    rounds = parseInt(emomRoundsMatch[1], 10);
  }

  if (!totalMinutes && !rounds) {
    const eMomBareMatch = lower.match(/\be\d+mom\s*(\d+)\b/);
    if (eMomBareMatch) {
      totalMinutes = parseInt(eMomBareMatch[1], 10);
    }
  }

  if (!totalMinutes && !rounds) {
    const bareMatch = lower.match(/emom\s*(\d+)\b/);
    if (bareMatch) {
      totalMinutes = parseInt(bareMatch[1], 10);
    }
  }

  if (!totalMinutes && !rounds) return null;
  return { intervalMinutes, rounds, totalMinutes };
}

function detectWorkoutStructure(lines: string[]): WorkoutStructure {
  const text = lines.join("\n").toLowerCase();

  const amrapBlocks = detectAMRAPBlocks(lines);
  if (amrapBlocks.length > 1) {
    return { type: "amrap", amrapBlocks };
  } else if (amrapBlocks.length === 1) {
    return { type: "amrap", timeLimit: amrapBlocks[0].timeLimit };
  }

  if (/\bamrap\b/.test(text)) {
    const timeMatch = text.match(/amrap\s*(?:for|in)?\s*([\d:]+\s*(?:min|mins|minutes|m\b|')?)/);
    const timeLimit = timeMatch ? parseTimeLimit(timeMatch[1]) ?? undefined : undefined;
    return { type: "amrap", timeLimit };
  }

  const ladderMatch = text.match(/(\d+(?:[-/]\d+){2,})/);
  if (ladderMatch) {
    const values = ladderMatch[1]
      .split(/[-/]/)
      .map((value) => parseInt(value, 10))
      .filter((value) => !Number.isNaN(value));
    return { type: "ladder", values, pattern: values.join("-") };
  }

  const emomDetails = detectEMOMDetails(text);
  if (emomDetails) {
    const timePerRound = emomDetails.intervalMinutes * 60;
    let rounds = emomDetails.rounds;
    let totalTime: number | undefined;

    if (emomDetails.totalMinutes) {
      totalTime = emomDetails.totalMinutes * 60;
      if (!rounds) {
        rounds = Math.max(1, Math.floor(totalTime / timePerRound));
      }
    } else if (rounds) {
      totalTime = rounds * timePerRound;
    }

    return { type: "emom", rounds, timePerRound, totalTime };
  }

  const roundsMatch = text.match(/(\d+)\s*(?:rounds?|rds|rft)\b/);
  if (roundsMatch) {
    return { type: "rounds", rounds: parseInt(roundsMatch[1], 10) };
  }

  if (/tabata|20\s*\/\s*10|20\s*sec\b.*10\s*sec/i.test(text)) {
    return { type: "tabata", rounds: 8, timePerRound: 30, workSeconds: 20, restSeconds: 10 };
  }

  if (/\bfor time\b|\bft\b/.test(text)) {
    return { type: "standard", forTime: true };
  }

  return { type: "standard" };
}

function extractCandidateMovement(text: string): string {
  return text
    .toLowerCase()
    .replace(/@\s*\d+(?:\.\d+)?\s*(?:lb|lbs|kg|kgs|#|%)/g, " ")
    .replace(/\b\d+(?:\.\d+)?\b/g, " ")
    .replace(/\b(?:x|sets?|reps?|rep|rounds?|rds|min|mins|minutes|sec|secs|seconds|amrap|emom|tabata|for time)\b/g, " ")
    .replace(/[^a-z\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getExerciseInfo(canonical: string): ExerciseInfo {
  const key = canonical.toLowerCase();
  if (exerciseInfoOverrides[key]) return exerciseInfoOverrides[key];

  const kb = knowledgeBaseMap.get(key);
  if (kb && kb.category === "cardio") {
    if (/row|rower|ski|bike|erg/.test(key)) {
      return { defaultUnit: "calories", altUnits: ["meters", "time"], category: "cardio" };
    }
    if (/run|sprint|walk|carry|sled|drag|crawl/.test(key)) {
      return { defaultUnit: "meters", altUnits: ["time"], category: "movement" };
    }
    return { defaultUnit: "time", category: "cardio" };
  }

  if (/plank|hold|hang/.test(key)) {
    return { defaultUnit: "time", category: "time" };
  }

  if (/run|sprint|walk|carry|sled|drag|crawl|lunge/.test(key)) {
    return { defaultUnit: "meters", altUnits: ["time"], category: "movement" };
  }

  if (/row|rower|ski|bike|erg/.test(key)) {
    return { defaultUnit: "calories", altUnits: ["meters", "time"], category: "cardio" };
  }

  return { defaultUnit: "reps", category: "movement" };
}

// Find exercise in database using glossary-driven matching
function findExercise(text: string): { canonical: string; info: ExerciseInfo } | null {
  const lowerText = text.toLowerCase();

  for (const matcher of movementMatchers) {
    if (matcher.regex.test(lowerText)) {
      return { canonical: matcher.canonical, info: getExerciseInfo(matcher.canonical) };
    }
  }

  const candidate = extractCandidateMovement(text);
  if (!candidate) return null;
  if (/\b(rest|warm up|cool down|mobility|stretch|finisher)\b/.test(candidate)) return null;
  if (candidate.length < 4) return null;

  const fuzzy = matchExercise(candidate, 0.75);
  if (fuzzy) {
    return { canonical: fuzzy.canonical, info: getExerciseInfo(fuzzy.canonical) };
  }

  return null;
}

// Extract units and numbers from text
function extractUnitsAndNumbers(text: string) {
  const units = {
    hasCalories: /\b\d+\s*(?:cal|cals|calories)\b/i.test(text),
    hasMeters: /\b\d+(?:\.\d+)?\s*(?:m|meter|meters|metres|km)\b/i.test(text),
    hasReps: /\b\d+\s*(?:reps?|rep)\b/i.test(text),
    hasTime: /\b\d+(?::\d+)?\s*(?:sec|secs|seconds|s\b|min|mins|minutes)\b/i.test(text),
    hasWeight: /\b\d+(?:\.\d+)?\s*(?:lb|lbs|kg|kgs|#)\b/i.test(text),
  };

  return { units };
}

function normalizeRange(value: string): string {
  return value.replace(/\s*(?:-|\u2013|\u2014)\s*/g, "-");
}

function extractRepDetails(text: string): RepDetails {
  const lower = text.toLowerCase();
  const repDetails: RepDetails = { repsText: "", sets: 1 };
  const notes: string[] = [];

  const ladderMatch = lower.match(/\b(\d+(?:[-/]\d+){2,})\b/);
  if (ladderMatch) {
    const values = ladderMatch[1].split(/[-/]/).map((val) => Number(val)).filter(Boolean);
    repDetails.values = values;
    repDetails.repsText = values.join("-");
    repDetails.sets = values.length;
    return repDetails;
  }

  const setRepMatch = lower.match(/(\d+)\s*(?:x|\u00d7)\s*(\d+(?:\s*(?:-|\u2013|\u2014)\s*\d+)?)(?:\s*(?:reps?|rep))?/);
  if (setRepMatch) {
    repDetails.sets = parseInt(setRepMatch[1], 10);
    repDetails.repsText = normalizeRange(setRepMatch[2]);
    const perSideMatch = lower.match(/(?:\/|per|each)\s*(side|leg|arm)\b/);
    if (perSideMatch) {
      const side = perSideMatch[1];
      repDetails.repsText = `${repDetails.repsText}/${side}`;
      notes.push(`Per ${side}`);
    }
    if (notes.length) repDetails.notes = notes;
    return repDetails;
  }

  const setOfMatch = lower.match(/(\d+)\s*sets?\s*(?:of|x)?\s*(\d+(?:\s*(?:-|\u2013|\u2014)\s*\d+)?)(?:\s*(?:reps?|rep))?/);
  if (setOfMatch) {
    repDetails.sets = parseInt(setOfMatch[1], 10);
    repDetails.repsText = normalizeRange(setOfMatch[2]);
    const perSideMatch = lower.match(/(?:\/|per|each)\s*(side|leg|arm)\b/);
    if (perSideMatch) {
      const side = perSideMatch[1];
      repDetails.repsText = `${repDetails.repsText}/${side}`;
      notes.push(`Per ${side}`);
    }
    if (notes.length) repDetails.notes = notes;
    return repDetails;
  }

  const repsRangeMatch = lower.match(/(\d+(?:\s*(?:-|\u2013|\u2014)\s*\d+))\s*(?:reps?|rep)\b/);
  if (repsRangeMatch) {
    repDetails.repsText = normalizeRange(repsRangeMatch[1]);
    const perSideMatch = lower.match(/(?:\/|per|each)\s*(side|leg|arm)\b/);
    if (perSideMatch) {
      const side = perSideMatch[1];
      repDetails.repsText = `${repDetails.repsText}/${side}`;
      notes.push(`Per ${side}`);
      repDetails.notes = notes;
    }
    return repDetails;
  }

  const timeFormatMatch = lower.match(/\b(\d+:\d{2})\b/);
  if (timeFormatMatch) {
    repDetails.repsText = timeFormatMatch[1];
    repDetails.primaryUnit = "time";
    return repDetails;
  }

  const unitNumber = lower.match(/(\d+(?:\.\d+)?)\s*(calories?|cals?|cal|meters?|metres?|km|m\b|reps?|rep\b|sec|secs|seconds?|s\b|minutes?|mins?|min\b)\b/);
  if (unitNumber) {
    repDetails.repsText = `${unitNumber[1]} ${unitNumber[2]}`.replace(/\s+/g, " ").trim();
    repDetails.primaryUnit = unitNumber[2].toLowerCase();
    const perSideMatch = lower.match(/(?:\/|per|each)\s*(side|leg|arm)\b/);
    if (perSideMatch) {
      const side = perSideMatch[1];
      repDetails.repsText = `${repDetails.repsText}/${side}`;
      notes.push(`Per ${side}`);
    }
    if (notes.length) repDetails.notes = notes;
    return repDetails;
  }

  const attachedUnit = lower.match(/(\d+(?:\.\d+)?)(km|m|cal|cals|reps?|sec|secs|min|mins)/);
  if (attachedUnit) {
    repDetails.repsText = `${attachedUnit[1]} ${attachedUnit[2]}`;
    repDetails.primaryUnit = attachedUnit[2].toLowerCase();
    const perSideMatch = lower.match(/(?:\/|per|each)\s*(side|leg|arm)\b/);
    if (perSideMatch) {
      const side = perSideMatch[1];
      repDetails.repsText = `${repDetails.repsText}/${side}`;
      notes.push(`Per ${side}`);
      repDetails.notes = notes;
    }
    return repDetails;
  }

  const numberAfterPeriod = lower.match(/\.\s*(\d+)/);
  if (numberAfterPeriod) {
    repDetails.repsText = numberAfterPeriod[1];
    return repDetails;
  }

  const allNumbers = text.match(/\d+/g);
  if (allNumbers && allNumbers.length > 0) {
    const largeNumbers = allNumbers.filter((n) => parseInt(n, 10) >= 5);
    const bestNumber = largeNumbers.length > 0 ? largeNumbers[largeNumbers.length - 1] : allNumbers[allNumbers.length - 1];
    repDetails.repsText = bestNumber;
  }

  const perSideMatch = lower.match(/(?:\/|per|each)\s*(side|leg|arm)\b/);
  if (perSideMatch && repDetails.repsText) {
    const side = perSideMatch[1];
    repDetails.repsText = `${repDetails.repsText}/${side}`;
    if (!notes.includes(`Per ${side}`)) {
      notes.push(`Per ${side}`);
    }
    repDetails.notes = notes;
  }

  return repDetails;
}

function normalizeWeightUnit(unit: string): string {
  const lower = unit.toLowerCase();
  if (lower === "#") return "lb";
  if (lower.startsWith("lb")) return "lb";
  if (lower.startsWith("kg")) return "kg";
  return lower;
}

function extractWeight(text: string): WeightDetails {
  const notes: string[] = [];

  const percentMatch = text.match(/@\s*(\d+(?:\.\d+)?)\s*%/i);
  if (percentMatch) {
    notes.push(`${percentMatch[1]}%`);
  }

  const rpeMatch = text.match(/\bRPE\s*(\d+(?:\.\d+)?)\b/i);
  if (rpeMatch) {
    notes.push(`RPE ${rpeMatch[1]}`);
  }

  const tempoMatch = text.match(/\btempo\s*([0-9-]{3,})/i);
  if (tempoMatch) {
    notes.push(`Tempo ${tempoMatch[1]}`);
  }

  const doubleWeightMatch = text.match(/(\d+)\s*(?:x|\u00d7)\s*(\d+(?:\.\d+)?)\s*(lb|lbs|kg|kgs|#)\b/i);
  if (doubleWeightMatch) {
    const count = doubleWeightMatch[1];
    const weight = doubleWeightMatch[2];
    const unit = normalizeWeightUnit(doubleWeightMatch[3]);
    return { weight: `${count}x${weight} ${unit}`, notes: notes.length ? notes : undefined };
  }

  const splitWeightMatch = text.match(/@\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)(?!\s*\/)\s*(lb|lbs|kg|kgs|#)?\b/i);
  if (splitWeightMatch) {
    const primary = splitWeightMatch[1];
    const secondary = splitWeightMatch[2];
    const unit = splitWeightMatch[3] ? normalizeWeightUnit(splitWeightMatch[3]) : "";
    const weight = unit ? `${primary}/${secondary} ${unit}` : `${primary}/${secondary}`;
    return { weight, notes: notes.length ? notes : undefined };
  }

  const splitUnitWeightMatch = text.match(/\b(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)(?!\s*\/)\s*(lb|lbs|kg|kgs|#)\b/i);
  if (splitUnitWeightMatch) {
    const primary = splitUnitWeightMatch[1];
    const secondary = splitUnitWeightMatch[2];
    const unit = normalizeWeightUnit(splitUnitWeightMatch[3]);
    return { weight: `${primary}/${secondary} ${unit}`, notes: notes.length ? notes : undefined };
  }

  const atWeightMatch = text.match(/@\s*(\d+(?:\.\d+)?)\s*(lb|lbs|kg|kgs|#)\b/i);
  if (atWeightMatch) {
    const weight = atWeightMatch[1];
    const unit = normalizeWeightUnit(atWeightMatch[2]);
    return { weight: `${weight} ${unit}`, notes: notes.length ? notes : undefined };
  }

  const weightMatch = text.match(/\b(\d+(?:\.\d+)?)\s*(lb|lbs|kg|kgs|#)\b/i);
  if (weightMatch) {
    const weight = weightMatch[1];
    const unit = normalizeWeightUnit(weightMatch[2]);
    return { weight: `${weight} ${unit}`, notes: notes.length ? notes : undefined };
  }

  return { notes: notes.length ? notes : undefined };
}

function resolveUnit(text: string, repDetails: RepDetails, info: ExerciseInfo, canonical: string): string {
  const primaryUnit = repDetails.primaryUnit;
  if (primaryUnit) {
    if (primaryUnit.startsWith("cal")) return "calories";
    if (primaryUnit === "m" || primaryUnit.startsWith("meter") || primaryUnit.startsWith("metre") || primaryUnit.startsWith("km")) {
      return "meters";
    }
    if (primaryUnit.startsWith("rep")) return "reps";
    if (primaryUnit.startsWith("sec") || primaryUnit.startsWith("min") || primaryUnit === "s" || primaryUnit === "time") {
      return "time";
    }
  }

  const { units } = extractUnitsAndNumbers(text);
  if (units.hasCalories) return "calories";
  if (units.hasMeters) return "meters";
  if (units.hasTime) return "time";
  if (units.hasReps) return "reps";

  return info.defaultUnit || getExerciseInfo(canonical).defaultUnit || "reps";
}

function formatMovementName(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function collectNotes(parts: Array<string | undefined>): string | undefined {
  const cleaned = parts
    .map((part) => (part ? String(part).trim() : ""))
    .filter((part) => part.length > 0);

  if (cleaned.length === 0) return undefined;

  const unique = Array.from(new Set(cleaned));
  return unique.join("; ");
}

function splitCompoundLine(line: string): string[] {
  let working = line;
  const placeholder = "__and__";

  protectedAndPhrases.forEach((phrase) => {
    const safePhrase = phrase.replace(/\sand\s/g, ` ${placeholder} `);
    const regex = new RegExp(escapeRegExp(phrase), "gi");
    working = working.replace(regex, safePhrase);
  });

  const parts = working.split(/\s*(?:\+|,|;|\s+and\s+|\s+\/\s+|\s+\|\s+)\s*/i);
  return parts
    .map((part) => part.replace(new RegExp(placeholder, "g"), "and").trim())
    .filter(Boolean);
}

function stripStructurePrefix(line: string): string {
  const match = line.match(
    /^(?:amrap|emom|e\d+mom|for time|tabata)(?:\s*(?:for|in)?\s*\d+\s*(?:min|mins|minutes|m\b|')?)?(?:\s*[-:])?\s*(.*)$/i
  );
  if (match && match[1] && match[1].trim().length > 0) {
    return match[1].trim();
  }

  const everyMatch = line.match(
    /^every\s*\d+(?::\d{2})?\s*(?:min|mins|minutes|m\b|sec|secs|seconds|s\b)?(?:\s*for\s*\d+\s*(?:min|mins|minutes|m\b|')\s*)?(?:\s*[-:])?\s*(.*)$/i
  );
  if (everyMatch && everyMatch[1] && everyMatch[1].trim().length > 0) {
    return everyMatch[1].trim();
  }

  const everyMinuteMatch = line.match(
    /^every minute(?:s)?(?:\s*for\s*\d+\s*(?:min|mins|minutes|m\b|')\s*)?(?:\s*[-:])?\s*(.*)$/i
  );
  if (everyMinuteMatch && everyMinuteMatch[1] && everyMinuteMatch[1].trim().length > 0) {
    return everyMinuteMatch[1].trim();
  }

  return line;
}

function parseExerciseLine(line: string, lineIndex: number, structure: WorkoutStructure): ParsedExercise[] {
  if (!line) return [];
  let trimmed = line.trim();
  if (!trimmed) return [];
  if (isNoiseLine(trimmed)) return [];
  if (isStructureLine(trimmed)) {
    const hasLadder = /\b\d+(?:[-/]\d+){2,}\b/.test(trimmed);
    if (!hasLadder) {
      const stripped = stripStructurePrefix(trimmed);
      if (stripped === trimmed && !findExactMovement(trimmed)) {
        return [];
      }
      trimmed = stripped;
    } else if (!findExactMovement(trimmed)) {
      return [];
    }
  }

  const segments = splitCompoundLine(trimmed);
  const exercises: ParsedExercise[] = [];

  segments.forEach((segment, segmentIndex) => {
    const matchedExercise = findExercise(segment);
    if (!matchedExercise) return;

    const repDetails = extractRepDetails(segment);
    const weightDetails = extractWeight(segment);
    const unit = resolveUnit(segment, repDetails, matchedExercise.info, matchedExercise.canonical);

    let reps = repDetails.repsText || "";
    let sets = repDetails.sets || 1;

    if (structure.type === "ladder" && structure.values && structure.values.length > 0) {
      reps = structure.values.join("-");
      sets = structure.values.length;
    }

    const weight = weightDetails.weight || matchedExercise.info.defaultWeight || "";
    const notes = collectNotes([
      matchedExercise.info.notes,
      ...(weightDetails.notes || []),
      ...(repDetails.notes || []),
    ]);

    const exercise: ParsedExercise = {
      id: `ex-${Date.now()}-${lineIndex}-${segmentIndex}`,
      name: formatMovementName(matchedExercise.canonical) || `Exercise ${lineIndex + 1}`,
      unit,
      sets,
      reps,
      weight,
      restSeconds: 60,
      notes,
    };

    if (unit === "meters" && reps) {
      exercise.distance = reps;
    }
    if (unit === "time" && reps) {
      exercise.timing = reps;
    }

    if (structure.type === "ladder" && structure.values) {
      exercise.values = structure.values;
    } else if (repDetails.values) {
      exercise.values = repDetails.values;
    }

    exercises.push(exercise);
  });

  return exercises;
}

function buildExercisesFromLines(
  lines: LineEntry[],
  structure: WorkoutStructure,
  skipIndex?: number
): ParsedExercise[] {
  const exercises: ParsedExercise[] = [];

  lines.forEach((entry) => {
    if (skipIndex !== undefined && entry.index === skipIndex) return;
    if (!entry.text) return;
    exercises.push(...parseExerciseLine(entry.text, entry.index, structure));
  });

  return exercises;
}

function buildAMRAPBlocks(
  lines: LineEntry[],
  blocks: AMRAPBlockInfo[],
  structure: WorkoutStructure,
  skipIndex?: number
): ParsedAMRAPBlock[] {
  const parsedBlocks: ParsedAMRAPBlock[] = [];

  blocks.forEach((block) => {
    const start = block.startLine;
    const end = block.endLine ?? block.startLine;
    const blockLines = lines.filter((entry) => entry.index >= start && entry.index <= end);
    const exercises = buildExercisesFromLines(blockLines, structure, skipIndex);
    if (exercises.length > 0) {
      parsedBlocks.push({
        id: block.id,
        label: block.label,
        timeLimit: block.timeLimit,
        order: block.order,
        exercises,
      });
    }
  });

  return parsedBlocks;
}

function extractEMOMLabel(line: string): { label: string; content: string } | null {
  const minuteMatch = line.match(/^(?:min|minute)\s*(\d+)\b[.:\-)]*\s*(.*)$/i);
  if (minuteMatch) {
    return { label: `Min ${minuteMatch[1]}`, content: minuteMatch[2] };
  }

  const oddEvenMatch = line.match(/^(odd|even)\s*(?:min|minute|minutes)\b[.:\-)]*\s*(.*)$/i);
  if (oddEvenMatch) {
    const label = `${oddEvenMatch[1].charAt(0).toUpperCase()}${oddEvenMatch[1].slice(1)} Minutes`;
    return { label, content: oddEvenMatch[2] };
  }

  return null;
}

function buildEMOMBlocks(
  lines: LineEntry[],
  structure: WorkoutStructure,
  skipIndex?: number
): { blocks: ParsedEMOMBlock[]; exercises: ParsedExercise[] } | null {
  const intervalSeconds = structure.timePerRound || 60;
  const blocksMap = new Map<string, ParsedEMOMBlock>();
  const exercises: ParsedExercise[] = [];
  let order = 1;

  lines.forEach((entry) => {
    if (skipIndex !== undefined && entry.index === skipIndex) return;
    const labelInfo = extractEMOMLabel(entry.text);
    if (!labelInfo) return;

    const blockId = labelInfo.label.toLowerCase().replace(/\s+/g, "-");
    if (!blocksMap.has(blockId)) {
      blocksMap.set(blockId, {
        id: `emom-${blockId}`,
        label: labelInfo.label,
        intervalSeconds,
        order,
        exercises: [],
      });
      order += 1;
    }

    const block = blocksMap.get(blockId);
    if (!block) return;

    const blockExercises = parseExerciseLine(labelInfo.content, entry.index, structure);
    if (blockExercises.length === 0) return;

    block.exercises.push(...blockExercises);
    exercises.push(...blockExercises);
  });

  const blocks = Array.from(blocksMap.values());
  if (blocks.length === 0) return null;

  return { blocks, exercises };
}

function formatDurationMinutes(seconds?: number): string | null {
  if (!seconds || seconds <= 0) return null;
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

function generateSummary(exercises: ParsedExercise[], structure: WorkoutStructure): string {
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

function generateBreakdown(exercises: ParsedExercise[], structure: WorkoutStructure): string[] {
  const breakdown: string[] = [];

  if (structure.type === "ladder" && structure.values) {
    breakdown.push(`Ladder format: ${structure.values.join("-")}`);
    exercises.forEach((ex) => {
      breakdown.push(`${ex.name}: ${structure.values?.map((v) => `${v} ${ex.unit}`).join(", ")}`);
    });
  } else {
    exercises.forEach((ex) => {
      let line = ex.name;
      if (ex.reps) line += ` - ${ex.reps}`;
      if (ex.weight) line += ` @ ${ex.weight}`;
      breakdown.push(line);
    });
  }

  return breakdown;
}

// Main parsing function
export function parseWorkoutContent(caption: string): ParsedWorkoutResult {
  const normalized = normalizeCaption(caption);
  const rawLines = normalized.split("\n");

  const lineEntries: LineEntry[] = rawLines.map((line, index) => ({
    text: stripLinePrefix(normalizeLine(line)),
    index,
  }));

  const titleResult = detectWorkoutTitle(lineEntries);
  const structure = detectWorkoutStructure(lineEntries.map((entry) => entry.text));
  const workoutType = structure.type;

  let exercises: ParsedExercise[] = [];
  let amrapBlocks: ParsedAMRAPBlock[] | undefined;
  let emomBlocks: ParsedEMOMBlock[] | undefined;

  if (workoutType === "amrap" && structure.amrapBlocks && structure.amrapBlocks.length > 1) {
    amrapBlocks = buildAMRAPBlocks(lineEntries, structure.amrapBlocks, structure, titleResult.index);
    exercises = amrapBlocks.flatMap((block) => block.exercises);
  } else if (workoutType === "emom") {
    const emomResult = buildEMOMBlocks(lineEntries, structure, titleResult.index);
    if (emomResult && emomResult.blocks.length > 1) {
      emomBlocks = emomResult.blocks;
      exercises = emomResult.exercises;
    } else {
      exercises = buildExercisesFromLines(lineEntries, structure, titleResult.index);
    }
  } else {
    exercises = buildExercisesFromLines(lineEntries, structure, titleResult.index);
  }

  const summary = generateSummary(exercises, structure);
  const breakdown = generateBreakdown(exercises, structure);

  return {
    title: titleResult.title,
    workoutType,
    exercises,
    structure,
    summary,
    breakdown,
    amrapBlocks,
    emomBlocks,
  };
}

export function assessParseConfidence(caption: string, parsed: ParsedWorkoutResult): number {
  const normalized = normalizeCaption(caption);
  const rawLines = normalized.split("\n");
  const lineEntries: LineEntry[] = rawLines.map((line, index) => ({
    text: stripLinePrefix(normalizeLine(line)),
    index,
  }));

  const candidateLines = lineEntries.filter((entry) => {
    if (isNoiseLine(entry.text)) return false;
    if (parsed.title && entry.text.toLowerCase() === parsed.title.toLowerCase()) return false;
    return true;
  });

  if (candidateLines.length === 0) {
    return parsed.exercises.length > 0 ? 0.4 : 0;
  }

  const movementLines = candidateLines.filter((entry) =>
    parseExerciseLine(entry.text, entry.index, parsed.structure).length > 0
  ).length;

  const coverage = movementLines / candidateLines.length;
  const density = Math.min(1, parsed.exercises.length / candidateLines.length);

  let confidence = 0.1 + coverage * 0.5 + density * 0.3;
  if (parsed.workoutType !== "standard" || parsed.structure.forTime) {
    confidence += 0.1;
  }
  if (parsed.title) {
    confidence += 0.05;
  }

  if (parsed.exercises.length === 0) {
    confidence = 0;
  }

  return Math.max(0, Math.min(1, confidence));
}
