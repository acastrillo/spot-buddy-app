/**
 * Training Profile - User Training Data and Preferences
 *
 * This module manages user training profiles including PRs, equipment, goals, and constraints.
 * Used to personalize AI workout enhancements and generation.
 */

/**
 * Personal Record for a specific exercise
 */
export interface PersonalRecord {
  weight: number;
  reps: number;
  unit: 'kg' | 'lbs';
  date: string; // ISO date: YYYY-MM-DD
  notes?: string;
}

/**
 * Training constraints (injuries, limitations)
 */
export interface TrainingConstraint {
  id: string;
  description: string;
  affectedExercises?: string[]; // Exercises to avoid
  createdAt: string;
}

/**
 * Complete training profile
 */
export interface TrainingProfile {
  // Personal Records
  personalRecords: Record<string, PersonalRecord>; // Exercise name  PR

  // Training preferences
  experience: 'beginner' | 'intermediate' | 'advanced';
  preferredSplit?: 'full-body' | 'upper-lower' | 'push-pull-legs' | 'bro-split' | 'custom';
  trainingDays: number; // 1-7
  sessionDuration?: number; // Minutes, typical workout length

  // Equipment
  equipment: string[]; // e.g., ['barbell', 'dumbbells', 'pull-up bar']
  trainingLocation?: 'home' | 'gym' | 'both';

  // Goals
  goals: string[]; // e.g., ['Build muscle', 'Increase strength', 'Lose fat']
  primaryGoal?: string;

  // Constraints
  constraints: TrainingConstraint[];

  // Preferences
  preferences?: {
    favoriteExercises?: string[];
    dislikedExercises?: string[];
    warmupRequired?: boolean;
    cooldownRequired?: boolean;
  };

  // Metadata
  updatedAt: string;
  createdAt?: string;
}

/**
 * Default training profile for new users
 */
export const defaultTrainingProfile: TrainingProfile = {
  personalRecords: {},
  experience: 'intermediate',
  trainingDays: 4,
  equipment: ['barbell', 'dumbbells', 'bench', 'squat rack', 'pull-up bar', 'cables'],
  goals: ['Build muscle', 'Increase strength'],
  constraints: [],
  updatedAt: new Date().toISOString(),
};

/**
 * Common equipment options
 * Comprehensive list covering home gym, boutique fitness, and commercial gym equipment
 */
export const EQUIPMENT_OPTIONS = [
  // Free Weights
  'Barbell',
  'Dumbbells',
  'Kettlebells',
  'Weight plates',
  'EZ curl bar',

  // Racks & Benches
  'Squat rack',
  'Power rack',
  'Bench (flat)',
  'Bench (adjustable)',
  'Preacher curl bench',

  // Bodyweight & Functional
  'Pull-up bar',
  'Dip station',
  'Gymnastics rings',
  'Parallettes',
  'Battle ropes',
  'Slam balls',

  // Cable & Machines
  'Cable machine',
  'Functional trainer',
  'Smith machine',
  'Leg press',
  'Leg extension',
  'Leg curl',
  'Lat pulldown',
  'Seated row',
  'Chest press machine',
  'Shoulder press machine',

  // Cardio Equipment
  'Treadmill',
  'Stationary bike',
  'Rowing machine',
  'Elliptical',
  'Stair climber',
  'Assault bike',
  'Ski erg',

  // Functional Training
  'Plyometric box',
  'Step platform',
  'TRX/Suspension trainer',
  'Resistance bands',
  'Resistance loops',
  'Medicine ball',
  'Weighted vest',
  'Sandbag',
  'Landmine attachment',

  // Recovery & Flexibility
  'Foam roller',
  'Yoga mat',
  'Massage gun',
  'Stretching strap',
  'Balance board',

  // Other
  'Jump rope',
  'Barre',
  'Ab wheel',
  'Glute-ham developer (GHD)',
  'Trap bar',
] as const;

/**
 * Common training goals
 * Clear, descriptive goals that LLMs can understand and use to personalize workouts
 */
export const TRAINING_GOALS = [
  'Build muscle (hypertrophy)',
  'Increase strength (powerlifting)',
  'Lose fat / Weight loss',
  'Improve cardiovascular endurance',
  'Improve mobility / Flexibility',
  'Athletic performance / Sports training',
  'General fitness / Health maintenance',
  'Bodybuilding / Physique competition',
  'Functional fitness / CrossFit',
  'Rehabilitation / Injury recovery',
  'Improve posture / Core stability',
  'Increase power / Explosiveness',
  'Marathon / Endurance event training',
  'Tone and define muscles',
  'Build work capacity / Conditioning',
] as const;

/**
 * Common exercises for PR tracking
 */
export const COMMON_EXERCISES = [
  // Chest
  'Bench press',
  'Incline bench press',
  'Dumbbell bench press',
  'Dips',

  // Back
  'Deadlift',
  'Barbell row',
  'Pull-ups',
  'Lat pulldown',

  // Shoulders
  'Overhead press',
  'Military press',
  'Dumbbell shoulder press',

  // Legs
  'Squat',
  'Front squat',
  'Romanian deadlift',
  'Leg press',

  // Arms
  'Barbell curl',
  'Close-grip bench press',
  'Skull crushers',
] as const;

/**
 * Calculate 1RM from a PR using Epley formula
 */
export function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

/**
 * Calculate working weight from 1RM (percentage-based)
 */
export function calculateWorkingWeight(oneRM: number, percentage: number): number {
  return Math.round((oneRM * percentage) / 5) * 5; // Round to nearest 5
}

/**
 * Get suggested working weight based on PR and training goal
 */
export function getSuggestedWeight(
  pr: PersonalRecord,
  goal: 'strength' | 'hypertrophy' | 'endurance'
): number {
  const oneRM = calculate1RM(pr.weight, pr.reps);

  switch (goal) {
    case 'strength':
      return calculateWorkingWeight(oneRM, 0.85); // 85% of 1RM, 3-5 reps
    case 'hypertrophy':
      return calculateWorkingWeight(oneRM, 0.75); // 75% of 1RM, 8-12 reps
    case 'endurance':
      return calculateWorkingWeight(oneRM, 0.65); // 65% of 1RM, 12-15 reps
    default:
      return calculateWorkingWeight(oneRM, 0.75);
  }
}

/**
 * Validate training profile
 */
export function validateTrainingProfile(profile: Partial<TrainingProfile>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Experience level
  if (profile.experience && !['beginner', 'intermediate', 'advanced'].includes(profile.experience)) {
    errors.push('Experience must be beginner, intermediate, or advanced');
  }

  // Training days
  if (profile.trainingDays !== undefined) {
    if (profile.trainingDays < 1 || profile.trainingDays > 7) {
      errors.push('Training days must be between 1 and 7');
    }
  }

  // Session duration
  if (profile.sessionDuration !== undefined) {
    if (profile.sessionDuration < 15 || profile.sessionDuration > 180) {
      errors.push('Session duration must be between 15 and 180 minutes');
    }
  }

  // Personal records
  if (profile.personalRecords) {
    for (const [exercise, pr] of Object.entries(profile.personalRecords)) {
      if (!pr.weight || pr.weight <= 0) {
        errors.push(`Invalid weight for ${exercise}: ${pr.weight}`);
      }
      if (!pr.reps || pr.reps <= 0) {
        errors.push(`Invalid reps for ${exercise}: ${pr.reps}`);
      }
      if (!pr.unit || !['kg', 'lbs'].includes(pr.unit)) {
        errors.push(`Invalid unit for ${exercise}: ${pr.unit}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merge profile updates with existing profile
 */
export function mergeTrainingProfile(
  existing: TrainingProfile,
  updates: Partial<TrainingProfile>
): TrainingProfile {
  return {
    ...existing,
    ...updates,
    personalRecords: {
      ...existing.personalRecords,
      ...updates.personalRecords,
    },
    equipment: updates.equipment ?? existing.equipment,
    goals: updates.goals ?? existing.goals,
    constraints: updates.constraints ?? existing.constraints,
    preferences: {
      ...existing.preferences,
      ...updates.preferences,
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Convert training profile to AI context string (for prompts)
 */
export function profileToAIContext(profile: TrainingProfile): string {
  let context = `**User Training Profile:**\n\n`;

  // Experience
  context += `- Experience: ${profile.experience}\n`;

  // Training schedule
  context += `- Training days: ${profile.trainingDays} days/week\n`;
  if (profile.sessionDuration) {
    context += `- Session duration: ${profile.sessionDuration} minutes\n`;
  }
  if (profile.preferredSplit) {
    context += `- Preferred split: ${profile.preferredSplit}\n`;
  }

  // Equipment
  if (profile.equipment.length > 0) {
    context += `- Available equipment: ${profile.equipment.join(', ')}\n`;
  }

  // Goals
  if (profile.goals.length > 0) {
    context += `- Training goals: ${profile.goals.join(', ')}\n`;
  }

  // Personal records
  if (Object.keys(profile.personalRecords).length > 0) {
    context += `\n**Personal Records:**\n`;
    for (const [exercise, pr] of Object.entries(profile.personalRecords)) {
      const oneRM = calculate1RM(pr.weight, pr.reps);
      context += `- ${exercise}: ${pr.weight} ${pr.unit} for ${pr.reps} reps (Est. 1RM: ${oneRM} ${pr.unit})\n`;
    }
  }

  // Constraints
  if (profile.constraints.length > 0) {
    context += `\n**Training Constraints:**\n`;
    for (const constraint of profile.constraints) {
      context += `- ${constraint.description}\n`;
      if (constraint.affectedExercises && constraint.affectedExercises.length > 0) {
        context += `  Avoid: ${constraint.affectedExercises.join(', ')}\n`;
      }
    }
  }

  return context;
}
