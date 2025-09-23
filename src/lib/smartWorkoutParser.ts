// Smart workout parser that understands exercise types, structures, and units
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

// Exercise database with common movements and their typical units
const exerciseDatabase: Record<string, ExerciseInfo> = {
  // Cardio equipment
  'row': { defaultUnit: 'calories', altUnits: ['meters', 'time'], category: 'cardio' },
  'rowing': { defaultUnit: 'calories', altUnits: ['meters', 'time'], category: 'cardio' },
  'bike': { defaultUnit: 'calories', altUnits: ['meters'], category: 'cardio' },
  'biking': { defaultUnit: 'calories', altUnits: ['meters'], category: 'cardio' },
  'run': { defaultUnit: 'meters', altUnits: ['time'], category: 'cardio' },
  'running': { defaultUnit: 'meters', altUnits: ['time'], category: 'cardio' },
  'ski': { defaultUnit: 'calories', altUnits: ['meters'], category: 'cardio' },
  'skierg': { defaultUnit: 'calories', altUnits: ['meters'], category: 'cardio' },

  // Bodyweight movements
  'burpees': { defaultUnit: 'reps', category: 'movement' },
  'burpee': { defaultUnit: 'reps', category: 'movement' },
  'push ups': { defaultUnit: 'reps', category: 'movement' },
  'push-ups': { defaultUnit: 'reps', category: 'movement' },
  'pushups': { defaultUnit: 'reps', category: 'movement' },
  'pull ups': { defaultUnit: 'reps', category: 'movement' },
  'pull-ups': { defaultUnit: 'reps', category: 'movement' },
  'pullups': { defaultUnit: 'reps', category: 'movement' },
  'air squats': { defaultUnit: 'reps', category: 'movement' },
  'squats': { defaultUnit: 'reps', category: 'movement' },
  'jump squats': { defaultUnit: 'reps', category: 'movement' },
  'mountain climbers': { defaultUnit: 'reps', category: 'movement' },
  'jumping jacks': { defaultUnit: 'reps', category: 'movement' },
  'sit ups': { defaultUnit: 'reps', category: 'movement' },
  'sit-ups': { defaultUnit: 'reps', category: 'movement' },
  'crunches': { defaultUnit: 'reps', category: 'movement' },
  'plank': { defaultUnit: 'time', category: 'time' },

  // Weighted movements
  'wall balls': { defaultUnit: 'reps', defaultWeight: '20 lb', category: 'strength' },
  'wall ball': { defaultUnit: 'reps', defaultWeight: '20 lb', category: 'strength' },
  'thrusters': { defaultUnit: 'reps', defaultWeight: '95 lb', category: 'strength' },
  'thruster': { defaultUnit: 'reps', defaultWeight: '95 lb', category: 'strength' },
  'deadlifts': { defaultUnit: 'reps', defaultWeight: '135 lb', category: 'strength' },
  'deadlift': { defaultUnit: 'reps', defaultWeight: '135 lb', category: 'strength' },
  'back squats': { defaultUnit: 'reps', defaultWeight: '135 lb', category: 'strength' },
  'back squat': { defaultUnit: 'reps', defaultWeight: '135 lb', category: 'strength' },
  'front squats': { defaultUnit: 'reps', defaultWeight: '95 lb', category: 'strength' },
  'front squat': { defaultUnit: 'reps', defaultWeight: '95 lb', category: 'strength' },
  'overhead press': { defaultUnit: 'reps', defaultWeight: '65 lb', category: 'strength' },
  'press': { defaultUnit: 'reps', defaultWeight: '65 lb', category: 'strength' },
  'bench press': { defaultUnit: 'reps', defaultWeight: '135 lb', category: 'strength' },

  // Kettlebell movements
  'kettlebell swings': { defaultUnit: 'reps', defaultWeight: '53 lb', category: 'strength' },
  'kb swings': { defaultUnit: 'reps', defaultWeight: '53 lb', category: 'strength' },
  'swings': { defaultUnit: 'reps', defaultWeight: '53 lb', category: 'strength' },
  'kettlebell snatches': { defaultUnit: 'reps', defaultWeight: '53 lb', category: 'strength' },
  'kb snatches': { defaultUnit: 'reps', defaultWeight: '53 lb', category: 'strength' },

  // Distance/carry movements
  'sled pull': { defaultUnit: 'meters', category: 'movement' },
  'sled push': { defaultUnit: 'meters', category: 'movement' },
  'farmer carry': { defaultUnit: 'meters', defaultWeight: '50 lb each', category: 'movement' },
  'farmers carry': { defaultUnit: 'meters', defaultWeight: '50 lb each', category: 'movement' },
  'walking lunges': { defaultUnit: 'meters', altUnits: ['reps'], category: 'movement' },
  'lunges': { defaultUnit: 'reps', altUnits: ['meters'], category: 'movement' },
  'bear crawl': { defaultUnit: 'meters', category: 'movement' },
  'crab walk': { defaultUnit: 'meters', category: 'movement' },

  // Box/jump movements
  'box jumps': { defaultUnit: 'reps', notes: '24" box', category: 'movement' },
  'box jump': { defaultUnit: 'reps', notes: '24" box', category: 'movement' },
  'jump rope': { defaultUnit: 'reps', altUnits: ['time'], category: 'cardio' },
  'double unders': { defaultUnit: 'reps', category: 'cardio' },

  // Olympic lifts
  'clean and jerk': { defaultUnit: 'reps', defaultWeight: '135 lb', category: 'strength' },
  'clean & jerk': { defaultUnit: 'reps', defaultWeight: '135 lb', category: 'strength' },
  'snatch': { defaultUnit: 'reps', defaultWeight: '95 lb', category: 'strength' },
  'power clean': { defaultUnit: 'reps', defaultWeight: '135 lb', category: 'strength' },
  'hang clean': { defaultUnit: 'reps', defaultWeight: '135 lb', category: 'strength' },
};

// Detect workout structure patterns
function detectWorkoutStructure(caption: string): WorkoutStructure {
  const text = caption.toLowerCase();

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

  // AMRAP patterns: "AMRAP 20", "20 min AMRAP"
  const amrapMatch = text.match(/(?:amrap\s*(\d+)|(\d+)\s*(?:min|minute)?\s*amrap)/);
  if (amrapMatch) {
    const time = parseInt(amrapMatch[1] || amrapMatch[2]);
    return { type: 'amrap', timeLimit: time };
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

// Find exercise in database (fuzzy matching)
function findExercise(text: string): ExerciseInfo | null {
  const cleanText = text.toLowerCase()
    .replace(/[•\-*]/g, '') // Remove bullets
    .replace(/\b(metres?|meters?|m\b|cals?|calories?|reps?|rep\b|x\d+|\d+x)/g, '') // Remove units
    .replace(/\d+/g, '') // Remove numbers
    .trim();

  // Direct match
  if (exerciseDatabase[cleanText]) {
    return exerciseDatabase[cleanText];
  }

  // Partial matches - find exercise name that appears in the text
  for (const [key, info] of Object.entries(exerciseDatabase)) {
    if (cleanText.includes(key) || key.includes(cleanText)) {
      return info;
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
  const lines = caption.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => !line.toUpperCase().includes('WORKOUT DETAILS'))
    .filter(line => !line.match(/^\d+(?:-\d+)*$/)) // Skip standalone number sequences
    .filter(line => !line.startsWith('#') && !line.startsWith('@')); // Skip hashtags and mentions

  const exercises: ParsedExercise[] = [];

  lines.forEach((line, index) => {
    // Skip lines that are just structure indicators
    if (line.match(/^\d+(?:-\d+)+$/)) return;
    
    const exerciseInfo = findExercise(line);
    const { units } = extractUnitsAndNumbers(line);
    
    // Clean exercise name
    let exerciseName = line
      .replace(/[•\-*]/g, '') // Remove bullets
      .replace(/\b(metres?|meters?|m\b|cals?|calories?|reps?|rep\b)/gi, '') // Remove unit words
      .replace(/\d+/g, '') // Remove numbers
      .trim();

    // Capitalize first letter
    exerciseName = exerciseName.charAt(0).toUpperCase() + exerciseName.slice(1);

    // Determine unit based on exercise info and text content
    let unit = 'reps'; // default
    let weight = '';
    let reps = '';

    if (exerciseInfo) {
      unit = exerciseInfo.defaultUnit;
      weight = exerciseInfo.defaultWeight || '';
      
      // Override unit if explicitly mentioned in text
      if (units.hasCalories) unit = 'calories';
      else if (units.hasMeters) unit = 'meters'; 
      else if (units.hasReps) unit = 'reps';
      else if (units.hasTime) unit = 'time';
    } else {
      // Fallback unit detection
      if (units.hasCalories) unit = 'calories';
      else if (units.hasMeters) unit = 'meters';
      else if (units.hasTime) unit = 'time';
    }

    // For ladder workouts, create structured reps
    if (structure.type === 'ladder' && structure.values) {
      const repsArray = structure.values.map(val => `${val} ${unit}`);
      reps = repsArray.join(', ');
    } else if (structure.type === 'rounds' && structure.rounds) {
      reps = `${structure.rounds} rounds`;
    }

    const exercise: ParsedExercise = {
      id: `ex-${Date.now()}-${index}`,
      name: exerciseName || `Exercise ${index + 1}`,
      unit,
      sets: structure.type === 'ladder' ? structure.values?.length || 1 : 1,
      reps: reps || '',
      weight,
      restSeconds: 60,
      notes: exerciseInfo?.notes || ''
    };

    // Store ladder values for special handling
    if (structure.type === 'ladder' && structure.values) {
      exercise.values = structure.values;
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
    case 'ladder':
      const rounds = structure.values?.length || 0;
      return `Ladder workout with ${exerciseCount} exercises, ${rounds} descending rounds.`;
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
      breakdown.push(`${ex.name}: ${structure.values?.map(v => `${v} ${ex.unit}`).join(', ')}`);
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