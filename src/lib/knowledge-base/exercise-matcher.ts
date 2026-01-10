/**
 * Exercise Matcher with Fuzzy String Matching
 *
 * Matches user input to canonical exercise names using:
 * 1. Exact match
 * 2. Alias match
 * 3. Fuzzy match (Levenshtein distance)
 */

import exercisesData from './exercises.json';
import workoutFormatsData from './workout-formats.json';

interface Exercise {
  canonical: string;
  aliases: string[];
  category: string;
  muscleGroups: string[];
  equipment: string[];
  movementPattern: string;
}

interface WorkoutFormat {
  type: string;
  name: string;
  aliases: string[];
  description: string;
  structure: Record<string, any>;
  indicators: string[];
  examples: string[];
}

// Levenshtein distance calculation (edit distance between two strings)
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Calculate similarity score (0-1, where 1 is exact match)
function similarityScore(a: string, b: string): number {
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1.0;

  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  return 1 - distance / maxLength;
}

// Normalize string for comparison
function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars except hyphens
    .replace(/\s+/g, ' ');    // Normalize whitespace
}

/**
 * Find the best matching exercise for a given input
 * @param input User's exercise name
 * @param threshold Minimum similarity score (0-1, default 0.7)
 * @returns Matched exercise or null if no good match
 */
export function matchExercise(input: string, threshold: number = 0.7): Exercise | null {
  const exercises = exercisesData.exercises as Exercise[];
  const normalizedInput = normalize(input);

  let bestMatch: Exercise | null = null;
  let bestScore = 0;

  for (const exercise of exercises) {
    // Check exact match with canonical name
    if (normalize(exercise.canonical) === normalizedInput) {
      return exercise;
    }

    // Check exact match with aliases
    for (const alias of exercise.aliases) {
      if (normalize(alias) === normalizedInput) {
        return exercise;
      }
    }

    // Calculate fuzzy match score with canonical name
    const canonicalScore = similarityScore(normalizedInput, normalize(exercise.canonical));
    if (canonicalScore > bestScore) {
      bestScore = canonicalScore;
      bestMatch = exercise;
    }

    // Calculate fuzzy match score with aliases
    for (const alias of exercise.aliases) {
      const aliasScore = similarityScore(normalizedInput, normalize(alias));
      if (aliasScore > bestScore) {
        bestScore = aliasScore;
        bestMatch = exercise;
      }
    }
  }

  // Only return match if it meets threshold
  return bestScore >= threshold ? bestMatch : null;
}

/**
 * Find the best matching workout format for given text
 * @param text Workout description text
 * @returns Detected workout format or null
 */
export function detectWorkoutFormat(text: string): WorkoutFormat | null {
  const formats = workoutFormatsData.formats as WorkoutFormat[];
  const normalizedText = normalize(text);

  for (const format of formats) {
    // Check if any indicators are present in the text
    for (const indicator of format.indicators) {
      if (normalizedText.includes(normalize(indicator))) {
        return format;
      }
    }

    // Check aliases
    for (const alias of format.aliases) {
      if (normalizedText.includes(normalize(alias))) {
        return format;
      }
    }
  }

  return null;
}

/**
 * Extract structured workout data from text
 * @param text Raw workout text
 * @returns Structured data with format detection
 */
export function parseWorkoutStructure(text: string): {
  detectedFormat: WorkoutFormat | null;
  metadata: Record<string, any>;
} {
  const detectedFormat = detectWorkoutFormat(text);
  const normalizedText = normalize(text);
  const metadata: Record<string, any> = {};

  if (!detectedFormat) {
    return { detectedFormat: null, metadata: {} };
  }

  // Extract rounds (e.g., "5 rounds", "EMOM 10", "3 RDS")
  const roundsMatch = normalizedText.match(/(\d+)\s*(rounds?|rds?|minutes?|mins?)/i);
  if (roundsMatch) {
    metadata.rounds = parseInt(roundsMatch[1], 10);
  }

  // Extract time (e.g., "20 minutes", "AMRAP 15", "for 30 mins")
  const timeMatch = normalizedText.match(/(?:for|amrap|in)?\s*(\d+)\s*(minutes?|mins?|seconds?|secs?)/i);
  if (timeMatch) {
    const value = parseInt(timeMatch[1], 10);
    const unit = timeMatch[2].toLowerCase();

    if (unit.startsWith('min')) {
      metadata.timeLimit = value;
      metadata.timeUnit = 'minutes';
    } else if (unit.startsWith('sec')) {
      metadata.timeLimit = value;
      metadata.timeUnit = 'seconds';
    }
  }

  // Extract rep scheme (e.g., "21-15-9", "1-2-3-4-5")
  const repSchemeMatch = normalizedText.match(/(\d+)-(\d+)-(\d+)/);
  if (repSchemeMatch) {
    metadata.repScheme = repSchemeMatch[0];
    metadata.pattern = 'ladder';
  }

  return { detectedFormat, metadata };
}

/**
 * Generate context prompt for Claude with exercise knowledge
 * @param exerciseNames Array of exercise names from user input
 * @returns Context string to include in Claude prompt
 */
export function generateExerciseContext(exerciseNames: string[]): string {
  const matches = exerciseNames
    .map(name => {
      const match = matchExercise(name, 0.6); // Lower threshold for context
      return match ? {
        input: name,
        canonical: match.canonical,
        category: match.category,
        muscleGroups: match.muscleGroups.join(', '),
        equipment: match.equipment.join(', '),
      } : null;
    })
    .filter(Boolean);

  if (matches.length === 0) {
    return '';
  }

  const contextLines = matches.map((match: any) =>
    `- "${match.input}" → ${match.canonical} (${match.category}, targets: ${match.muscleGroups})`
  );

  return `\n\nEXERCISE KNOWLEDGE BASE:\nRecognized exercises:\n${contextLines.join('\n')}`;
}

/**
 * Get all exercises in a category
 */
export function getExercisesByCategory(category: string): Exercise[] {
  const exercises = exercisesData.exercises as Exercise[];
  return exercises.filter(ex => ex.category.toLowerCase() === category.toLowerCase());
}

/**
 * Get all exercises that use specific equipment
 */
export function getExercisesByEquipment(equipment: string): Exercise[] {
  const exercises = exercisesData.exercises as Exercise[];
  return exercises.filter(ex =>
    ex.equipment.some(eq => normalize(eq).includes(normalize(equipment)))
  );
}

/**
 * Get exercise suggestions based on partial input
 */
export function suggestExercises(partial: string, limit: number = 5): Exercise[] {
  const exercises = exercisesData.exercises as Exercise[];
  const normalizedInput = normalize(partial);

  // Score each exercise
  const scored = exercises.map(exercise => {
    let score = 0;

    // Check if canonical name starts with input
    if (normalize(exercise.canonical).startsWith(normalizedInput)) {
      score += 10;
    }

    // Check if any alias starts with input
    for (const alias of exercise.aliases) {
      if (normalize(alias).startsWith(normalizedInput)) {
        score += 8;
      }
    }

    // Check if canonical name contains input
    if (normalize(exercise.canonical).includes(normalizedInput)) {
      score += 5;
    }

    // Calculate similarity
    score += similarityScore(normalizedInput, normalize(exercise.canonical)) * 3;

    return { exercise, score };
  });

  // Sort by score and return top matches
  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.exercise);
}

/**
 * Validate if an exercise name is recognized
 */
export function isRecognizedExercise(name: string, threshold: number = 0.7): boolean {
  return matchExercise(name, threshold) !== null;
}

/**
 * Get all available workout formats
 */
export function getAllWorkoutFormats(): WorkoutFormat[] {
  return workoutFormatsData.formats as WorkoutFormat[];
}

/**
 * Get statistics about the knowledge base
 */
export function getKnowledgeBaseStats() {
  const exercises = exercisesData.exercises as Exercise[];
  const formats = workoutFormatsData.formats as WorkoutFormat[];

  return {
    totalExercises: exercises.length,
    totalFormats: formats.length,
    categories: [...new Set(exercises.map(ex => ex.category))],
    equipment: [...new Set(exercises.flatMap(ex => ex.equipment))],
    movementPatterns: [...new Set(exercises.map(ex => ex.movementPattern))],
  };
}
