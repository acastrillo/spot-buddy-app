// Smart workout parser that understands exercise types, structures, and units
import glossary from "../../data/spotter_glossary.json";

interface ExerciseInfo {
  defaultUnit: string;
  altUnits?: string[];
  defaultWeight?: string;
  category?: 'cardio' | 'strength' | 'movement' | 'time';
  notes?: string;
}

interface WorkoutStructure {
  type: 'ladder' | 'rounds' | 'amrap' | 'emom' | 'tabata' | 'fortime' | 'simple';
  values?: number[];
  rounds?: number;
  timeLimit?: number;
  amrapBlocks?: AMRAPBlockInfo[];
}

interface AMRAPBlockInfo {
  id: string;
  label: string;
  timeLimit: number;
  order: number;
  startLine: number;
  endLine?: number;
}

interface ParsedExercise {
  id: string;
  name: string;
  unit: string;
  values?: number[];
  sets?: number;
  reps?: string;
  weight?: string;
  restSeconds?: number;
  notes?: string;
}

interface MovementMatcher {
  canonical: string;
  regex: RegExp;
}

interface RepDetails {
  repsText: string;
  sets: number;
  values?: number[];
  primaryUnit?: string;
}

// Exercise database with common movements and their typical units
const exerciseDatabase: Record<string, ExerciseInfo> = {
  // Monostructural cardio
  row: { defaultUnit: 'calories', altUnits: ['meters', 'time'], category: 'cardio' },
  rower: { defaultUnit: 'calories', altUnits: ['meters', 'time'], category: 'cardio' },
  bike: { defaultUnit: 'calories', altUnits: ['meters', 'time'], category: 'cardio' },
  run: { defaultUnit: 'meters', altUnits: ['time'], category: 'cardio' },
  ski: { defaultUnit: 'calories', altUnits: ['meters', 'time'], category: 'cardio' },
  'ski erg': { defaultUnit: 'calories', altUnits: ['meters', 'time'], category: 'cardio' },
  'bike erg': { defaultUnit: 'calories', altUnits: ['meters', 'time'], category: 'cardio' },
  running: { defaultUnit: 'meters', altUnits: ['time'], category: 'cardio' },
  biking: { defaultUnit: 'calories', altUnits: ['meters'], category: 'cardio' },
  rowing: { defaultUnit: 'calories', altUnits: ['meters', 'time'], category: 'cardio' },

  // Bodyweight movements
  burpee: { defaultUnit: 'reps', category: 'movement' },
  burpees: { defaultUnit: 'reps', category: 'movement' },
  'burpee box jump': { defaultUnit: 'reps', category: 'movement' },
  'push-up': { defaultUnit: 'reps', category: 'movement' },
  'push ups': { defaultUnit: 'reps', category: 'movement' },
  'push-ups': { defaultUnit: 'reps', category: 'movement' },
  'pull-up': { defaultUnit: 'reps', category: 'movement' },
  'pull ups': { defaultUnit: 'reps', category: 'movement' },
  'pull-ups': { defaultUnit: 'reps', category: 'movement' },
  squat: { defaultUnit: 'reps', category: 'movement' },
  'air squats': { defaultUnit: 'reps', category: 'movement' },
  'jump squats': { defaultUnit: 'reps', category: 'movement' },
  'mountain climber': { defaultUnit: 'reps', category: 'movement' },
  'mountain climbers': { defaultUnit: 'reps', category: 'movement' },
  'jumping jacks': { defaultUnit: 'reps', category: 'movement' },
  'sit-up': { defaultUnit: 'reps', category: 'movement' },
  'sit ups': { defaultUnit: 'reps', category: 'movement' },
  crunches: { defaultUnit: 'reps', category: 'movement' },
  plank: { defaultUnit: 'time', category: 'time' },
  'side plank': { defaultUnit: 'time', category: 'time' },
  'handstand walk': { defaultUnit: 'meters', altUnits: ['time'], category: 'movement' },
  'handstand push-up': { defaultUnit: 'reps', category: 'movement' },
  'toes to bar': { defaultUnit: 'reps', category: 'movement' },
  'muscle up': { defaultUnit: 'reps', category: 'movement' },
  'russian twist': { defaultUnit: 'reps', category: 'movement' },
  'v-up': { defaultUnit: 'reps', category: 'movement' },
  lunge: { defaultUnit: 'reps', altUnits: ['meters'], category: 'movement' },
  'walking lunge': { defaultUnit: 'meters', altUnits: ['reps'], category: 'movement' },
  'bear crawl': { defaultUnit: 'meters', category: 'movement' },
  hop: { defaultUnit: 'reps', category: 'movement' },

  // Weighted movements
  'wall ball': { defaultUnit: 'reps', defaultWeight: '20 lb', category: 'strength' },
  'thruster': { defaultUnit: 'reps', defaultWeight: '95 lb', category: 'strength' },
  deadlift: { defaultUnit: 'reps', defaultWeight: '135 lb', category: 'strength' },
  'back squat': { defaultUnit: 'reps', defaultWeight: '135 lb', category: 'strength' },
  'front squat': { defaultUnit: 'reps', defaultWeight: '95 lb', category: 'strength' },
  'overhead press': { defaultUnit: 'reps', defaultWeight: '65 lb', category: 'strength' },
  'push press': { defaultUnit: 'reps', defaultWeight: '95 lb', category: 'strength' },
  'shoulder to overhead': { defaultUnit: 'reps', defaultWeight: '95 lb', category: 'strength' },
  'bench press': { defaultUnit: 'reps', defaultWeight: '135 lb', category: 'strength' },
  'overhead squat': { defaultUnit: 'reps', defaultWeight: '95 lb', category: 'strength' },
  'squat clean': { defaultUnit: 'reps', defaultWeight: '135 lb', category: 'strength' },
  'hang clean': { defaultUnit: 'reps', defaultWeight: '135 lb', category: 'strength' },
  'clean and jerk': { defaultUnit: 'reps', defaultWeight: '135 lb', category: 'strength' },
  'snatch': { defaultUnit: 'reps', defaultWeight: '95 lb', category: 'strength' },
  'hang snatch': { defaultUnit: 'reps', defaultWeight: '95 lb', category: 'strength' },
  'devil press': { defaultUnit: 'reps', defaultWeight: '2 x 35 lb', category: 'strength' },

  // Distance/carry movements
  'sled pull': { defaultUnit: 'meters', category: 'movement' },
  'sled push': { defaultUnit: 'meters', category: 'movement' },
  'farmer carry': { defaultUnit: 'meters', defaultWeight: '50 lb each', category: 'movement' },
  'farmer hold': { defaultUnit: 'time', defaultWeight: '50 lb each', category: 'movement' },
  'walking lunges': { defaultUnit: 'meters', altUnits: ['reps'], category: 'movement' },
  'crab walk': { defaultUnit: 'meters', category: 'movement' },

  // Box/jump movements
  'box jump': { defaultUnit: 'reps', notes: '24\" box', category: 'movement' },
  'box step-up': { defaultUnit: 'reps', notes: '20\" box', category: 'movement' },
  'step-up': { defaultUnit: 'reps', notes: '20\" box', category: 'movement' },
  'jump rope': { defaultUnit: 'reps', altUnits: ['time'], category: 'cardio' },
  'double under': { defaultUnit: 'reps', category: 'cardio' },
  'single under': { defaultUnit: 'reps', category: 'cardio' },

  // Kettlebell movements
  'kettlebell swing': { defaultUnit: 'reps', defaultWeight: '53 lb', category: 'strength' },
  'kettlebell swings': { defaultUnit: 'reps', defaultWeight: '53 lb', category: 'strength' },
  'kettlebell snatch': { defaultUnit: 'reps', defaultWeight: '53 lb', category: 'strength' },
  'kettlebell snatches': { defaultUnit: 'reps', defaultWeight: '53 lb', category: 'strength' }
};

const movementMatchers: MovementMatcher[] = Object.entries((glossary as any).movements || {}).flatMap(
  ([canonical, aliases]) => {
    const names = [canonical, ...(aliases as string[])];
    return names.map((name) => ({
      canonical,
      regex: new RegExp(`\\b${escapeRegExp(name.toLowerCase())}\\b`, 'i')
    }));
  }
);

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse time limit from various AMRAP formats
 * Supports: "20", "20 min", "20 minutes", "90 sec", "90 seconds", "10:30"
 */
function parseTimeLimit(timeStr: string): number | null {
  const lower = timeStr.toLowerCase().trim();

  // MM:SS format (e.g., "10:30" = 630 seconds)
  const timeFormatMatch = lower.match(/(\d+):(\d+)/);
  if (timeFormatMatch) {
    const minutes = parseInt(timeFormatMatch[1]);
    const seconds = parseInt(timeFormatMatch[2]);
    return minutes * 60 + seconds;
  }

  // Seconds format (e.g., "90 sec" = 90 seconds)
  const secondsMatch = lower.match(/(\d+)\s*(?:sec|second|seconds|s\b)/);
  if (secondsMatch) {
    return parseInt(secondsMatch[1]);
  }

  // Minutes format (e.g., "20 min" = 1200 seconds)
  const minutesMatch = lower.match(/(\d+)\s*(?:min|minute|minutes|m\b)?/);
  if (minutesMatch) {
    return parseInt(minutesMatch[1]) * 60;
  }

  return null;
}

/**
 * Detect multiple AMRAP blocks in workout caption
 * Returns array of blocks with section markers and time limits
 */
function detectAMRAPBlocks(caption: string): AMRAPBlockInfo[] {
  const lines = caption.split('\n');
  const blocks: AMRAPBlockInfo[] = [];

  // Enhanced AMRAP patterns supporting multiple formats
  const amrapPatterns = [
    // "Part A: AMRAP 15 MIN" or "Part B - AMRAP 10"
    /(?:part\s+([a-z])|section\s+([a-z]))[:\-\s]*amrap\s+(?:for|in)?\s*(.+)/i,
    // "Block 1: AMRAP 20 MIN" or "Block 2 - AMRAP 10"
    /(?:block|round)\s+(\d+)[:\-\s]*amrap\s+(?:for|in)?\s*(.+)/i,
    // Emoji numbers: "1️⃣ AMRAP 15 MIN"
    /([0-9️⃣①②③④⑤⑥⑦⑧⑨])\s*amrap\s+(?:for|in)?\s*(.+)/i,
    // Standard: "AMRAP 20 MIN" with variations
    /amrap\s+(?:for|in)?\s*(.+)/i,
  ];

  lines.forEach((line, lineIndex) => {
    const lower = line.toLowerCase();

    // Try each pattern
    for (const pattern of amrapPatterns) {
      const match = line.match(pattern);
      if (!match) continue;

      let label = 'AMRAP';
      let timeStr = '';

      if (match[1]) {
        // Part A/B or Block number
        label = match[1].toUpperCase().startsWith('PART')
          ? `Part ${match[1].toUpperCase()}`
          : `Block ${match[1]}`;
        timeStr = match[2] || match[3] || '';
      } else if (match[2]) {
        // Emoji or other marker
        label = `Block ${blocks.length + 1}`;
        timeStr = match[2];
      } else {
        timeStr = match[1] || '';
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
        break; // Found a match, move to next line
      }
    }
  });

  // Set end lines for each block (end of one block = start of next)
  for (let i = 0; i < blocks.length - 1; i++) {
    blocks[i].endLine = blocks[i + 1].startLine - 1;
  }
  if (blocks.length > 0) {
    blocks[blocks.length - 1].endLine = lines.length - 1;
  }

  return blocks;
}

// Detect workout structure patterns
function detectWorkoutStructure(caption: string): WorkoutStructure {
  const text = caption.toLowerCase();

  // First, check for multi-block AMRAP workouts
  const amrapBlocks = detectAMRAPBlocks(caption);
  if (amrapBlocks.length > 1) {
    // Multi-block AMRAP detected
    return { type: 'amrap', amrapBlocks };
  } else if (amrapBlocks.length === 1) {
    // Single AMRAP block
    return { type: 'amrap', timeLimit: amrapBlocks[0].timeLimit };
  }

  // Ladder/pyramid patterns: "50-40-30-20-10", "21-15-9", "5-4-3-2-1"
  const ladderMatch = caption.match(/(\d+(?:-\d+){2,})/);
  if (ladderMatch) {
    const values = ladderMatch[1].split('-').map(Number);
    return { type: 'ladder', values };
  }

  // Round patterns: "5 rounds", "3 RFT"
  const roundsMatch = text.match(/(\d+)\s*(?:rounds?|rft|r)/);
  if (roundsMatch) {
    return { type: 'rounds', rounds: parseInt(roundsMatch[1]) };
  }

  // EMOM patterns: "EMOM 10", "Every minute for 10"
  const emomMatch = text.match(/(?:emom\s*(\d+)|every\s*minute.*?(\d+))/);
  if (emomMatch) {
    const time = parseInt(emomMatch[1] || emomMatch[2]);
    return { type: 'emom', timeLimit: time };
  }

  // Tabata patterns: "Tabata", "8 rounds 20 on 10 off"
  if (text.includes('tabata') || (text.includes('20') && text.includes('10') && text.includes('rounds'))) {
    return { type: 'tabata', rounds: 8 };
  }

  // For Time patterns
  if (text.includes('for time') || text.includes('ft')) {
    return { type: 'fortime' };
  }

  return { type: 'simple' };
}

// Find exercise in database using glossary-driven matching
function findExercise(text: string): { canonical: string; info: ExerciseInfo } | null {
  const lowerText = text.toLowerCase();

  for (const matcher of movementMatchers) {
    if (matcher.regex.test(lowerText)) {
      const canonical = matcher.canonical.toLowerCase();
      const info = exerciseDatabase[canonical] || { defaultUnit: 'reps', category: 'movement' };
      return { canonical, info };
    }
  }

  return null;
}

// Extract units and numbers from text
function extractUnitsAndNumbers(text: string) {
  const units = {
    hasCalories: /\bcals?\b|\bcalories?\b/i.test(text),
    hasMeters: /\bmetres?\b|\bmeters?\b|\bm\b/i.test(text),
    hasReps: /\breps?\b|\brep\b/i.test(text),
    hasTime: /\bsec\b|\bmin\b|\bseconds?\b|\bminutes?\b/i.test(text),
    hasWeight: /\blb\b|\bkg\b|\b#\b|\bpounds?\b/i.test(text)
  };

  return { units };
}

function extractRepDetails(text: string): RepDetails {
  const lower = text.toLowerCase();
  const repDetails: RepDetails = { repsText: '', sets: 1 };

  const ladderMatch = lower.match(/\b(\d+(?:-\d+)+)\b/);
  if (ladderMatch) {
    const values = ladderMatch[1].split('-').map(Number).filter(Boolean);
    repDetails.values = values;
    repDetails.repsText = values.join('-');
    repDetails.sets = values.length;
    return repDetails;
  }

  const setRepMatch = lower.match(/(\d+)\s*[xX]\s*(\d+)/);
  if (setRepMatch) {
    repDetails.sets = parseInt(setRepMatch[1]);
    repDetails.repsText = setRepMatch[2];
    return repDetails;
  }

  const roundsMatch = lower.match(/(\d+)\s*(?:rounds?|sets?)/);
  if (roundsMatch) {
    repDetails.sets = parseInt(roundsMatch[1]);
  }

  // IMPORTANT: Match numbers with units, but exclude "Min" when it's part of "Min 1." or "Min 2." pattern (EMOM format)
  // This regex looks for a number followed by a unit, but uses a negative lookbehind to avoid matching "min" in "Min 1."
  const unitNumber = lower.match(/(?<!^min\s+\d+\.\s+)(\d+)\s*(calories?|cals?|cal|meters?|metres?|m\b|km|reps?|rep\b|sec|secs|seconds?)\b/);
  if (unitNumber) {
    repDetails.repsText = `${unitNumber[1]} ${unitNumber[2]}`.replace(/\s+/g, ' ').trim();
    repDetails.primaryUnit = unitNumber[2].toLowerCase();
    return repDetails;
  }

  const attachedUnit = lower.match(/(\d+)(m|km|cal|cals|reps?|sec|secs)/);
  if (attachedUnit) {
    repDetails.repsText = `${attachedUnit[1]} ${attachedUnit[2]}`;
    repDetails.primaryUnit = attachedUnit[2].toLowerCase();
    return repDetails;
  }

  // Extract the main number - prioritize larger numbers (12 over 1 in "Min 1. 12 Squats")
  // First try to match a number that comes after a period (common in EMOM format: "Min 1. 12 Squats")
  const numberAfterPeriod = lower.match(/\.\s*(\d+)/);
  if (numberAfterPeriod) {
    repDetails.repsText = numberAfterPeriod[1];
    return repDetails;
  }

  // Otherwise, get the last/largest number in the text (likely to be the rep count)
  const allNumbers = text.match(/\d+/g);
  if (allNumbers && allNumbers.length > 0) {
    // For EMOM format "Min 1. 12 Squats", we want 12, not 1
    // Take the last number that's >= 5 (more likely to be reps), otherwise take the last number
    const largeNumbers = allNumbers.filter(n => parseInt(n) >= 5);
    const bestNumber = largeNumbers.length > 0 ? largeNumbers[largeNumbers.length - 1] : allNumbers[allNumbers.length - 1];
    repDetails.repsText = bestNumber;
  }

  return repDetails;
}

function formatMovementName(name: string) {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// Main parsing function
export function parseWorkoutContent(caption: string): {
  exercises: ParsedExercise[];
  structure: WorkoutStructure;
  summary: string;
  breakdown: string[];
} {
  // Detect overall workout structure
  const structure = detectWorkoutStructure(caption);

  // Split into lines and filter out empty/header lines
  const lines = caption
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.toUpperCase().includes('WORKOUT DETAILS'))
    .filter((line) => !line.match(/^\d+(?:-\d+)*$/)) // Skip standalone number sequences
    .filter((line) => !line.startsWith('#') && !line.startsWith('@')); // Skip hashtags and mentions

  const exercises: ParsedExercise[] = [];

  lines.forEach((line, index) => {
    // Skip lines that are just structure indicators
    if (line.match(/^\d+(?:-\d+)+$/)) return;

    const matchedExercise = findExercise(line);
    if (!matchedExercise) {
      return; // Only create a card when a known movement is present
    }

    const { units } = extractUnitsAndNumbers(line);
    const repDetails = extractRepDetails(line);
    const exerciseName = formatMovementName(matchedExercise.canonical);

    // Determine unit based on exercise info and text content
    let unit = matchedExercise.info.defaultUnit || 'reps';
    const weight = matchedExercise.info.defaultWeight || '';
    let reps = repDetails.repsText || '';
    let sets = repDetails.sets || 1;

    const primaryUnit = repDetails.primaryUnit;
    if (primaryUnit) {
      if (primaryUnit.startsWith('cal')) unit = 'calories';
      else if (['m', 'meter', 'meters', 'metres', 'km'].some((u) => primaryUnit.startsWith(u))) unit = 'meters';
      else if (primaryUnit.startsWith('rep')) unit = 'reps';
      else if (primaryUnit.startsWith('sec') || primaryUnit.startsWith('min')) unit = 'time';
    } else if (units.hasCalories) unit = 'calories';
    else if (units.hasMeters) unit = 'meters';
    else if (units.hasReps) unit = 'reps';
    else if (units.hasTime) unit = 'time';

    // For ladder workouts, create structured reps
    if (structure.type === 'ladder' && structure.values) {
      const repsArray = structure.values.map((val) => `${val} ${unit}`);
      reps = repsArray.join(', ');
      repDetails.values = structure.values;
      sets = structure.values.length;
    } else if (structure.type === 'rounds' && structure.rounds && !reps) {
      reps = `${structure.rounds} rounds`;
      sets = structure.rounds;
    }

    const exercise: ParsedExercise = {
      id: `ex-${Date.now()}-${index}`,
      name: exerciseName || `Exercise ${index + 1}`,
      unit,
      sets,
      reps: reps || '',
      weight,
      restSeconds: 60,
      notes: matchedExercise.info.notes || ''
    };

    // Store ladder values for special handling
    if (structure.type === 'ladder' && structure.values) {
      exercise.values = structure.values;
    } else if (repDetails.values) {
      exercise.values = repDetails.values;
    }

    exercises.push(exercise);
  });

  // Generate summary and breakdown
  const summary = generateSummary(exercises, structure);
  const breakdown = generateBreakdown(exercises, structure);

  return { exercises, structure, summary, breakdown };
}

function generateSummary(exercises: ParsedExercise[], structure: WorkoutStructure): string {
  const exerciseCount = exercises.length;

  switch (structure.type) {
    case 'ladder': {
      const rounds = structure.values?.length || 0;
      return `Ladder workout with ${exerciseCount} exercises, ${rounds} descending rounds.`;
    }
    case 'rounds':
      return `${structure.rounds} rounds of ${exerciseCount} exercises.`;
    case 'amrap':
      return `AMRAP ${structure.timeLimit} min with ${exerciseCount} exercises.`;
    case 'emom':
      return `EMOM ${structure.timeLimit} min with ${exerciseCount} exercises.`;
    case 'tabata':
      return `Tabata workout (8 rounds, 20s on/10s off) with ${exerciseCount} exercises.`;
    case 'fortime':
      return `For Time workout with ${exerciseCount} exercises.`;
    default:
      return `Workout with ${exerciseCount} exercises.`;
  }
}

function generateBreakdown(exercises: ParsedExercise[], structure: WorkoutStructure): string[] {
  const breakdown: string[] = [];

  if (structure.type === 'ladder' && structure.values) {
    breakdown.push(`Ladder format: ${structure.values.join('-')}`);
    exercises.forEach((ex) => {
      breakdown.push(`${ex.name}: ${structure.values?.map((v) => `${v} ${ex.unit}`).join(', ')}`);
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
