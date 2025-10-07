/**
 * Body Metrics - Track body weight, measurements, and composition
 */

export interface BodyWeightEntry {
  userId: string;
  date: string; // ISO string
  weight: number;
  unit: 'lbs' | 'kg';
  notes?: string;
}

export interface BodyMeasurements {
  userId: string;
  date: string; // ISO string
  chest?: number; // inches or cm
  waist?: number;
  hips?: number;
  biceps?: number; // left and right average
  thighs?: number;
  calves?: number;
  shoulders?: number;
  neck?: number;
  unit: 'in' | 'cm';
  notes?: string;
}

export interface BodyComposition {
  userId: string;
  date: string; // ISO string
  bodyFatPercentage?: number;
  leanMass?: number; // lbs or kg
  fatMass?: number;
  unit: 'lbs' | 'kg';
  method?: 'dexa' | 'calipers' | 'bioimpedance' | 'visual' | 'other';
  notes?: string;
}

/**
 * Calculate BMI
 */
export function calculateBMI(weight: number, heightInches: number, unit: 'lbs' | 'kg' = 'lbs'): number {
  if (unit === 'lbs') {
    // BMI = (weight in pounds × 703) / (height in inches)²
    return (weight * 703) / (heightInches * heightInches);
  } else {
    // Convert kg and inches to metric
    const heightMeters = heightInches * 0.0254;
    return weight / (heightMeters * heightMeters);
  }
}

/**
 * Get BMI category
 */
export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

/**
 * Calculate lean mass from body fat percentage
 */
export function calculateLeanMass(totalWeight: number, bodyFatPercentage: number): number {
  return totalWeight * (1 - bodyFatPercentage / 100);
}

/**
 * Calculate fat mass from body fat percentage
 */
export function calculateFatMass(totalWeight: number, bodyFatPercentage: number): number {
  return totalWeight * (bodyFatPercentage / 100);
}

/**
 * Convert inches to cm
 */
export function inToCm(inches: number): number {
  return inches * 2.54;
}

/**
 * Convert cm to inches
 */
export function cmToIn(cm: number): number {
  return cm / 2.54;
}

/**
 * Calculate weight change rate
 */
export function calculateWeightChangeRate(
  entries: BodyWeightEntry[],
  days: number = 7
): { rate: number; trend: 'gaining' | 'losing' | 'stable' } | null {
  if (entries.length < 2) return null;

  // Sort by date
  const sorted = [...entries].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Get entries within the time window
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const recentEntries = sorted.filter(e => new Date(e.date) >= cutoffDate);

  if (recentEntries.length < 2) return null;

  const firstEntry = recentEntries[0];
  const lastEntry = recentEntries[recentEntries.length - 1];

  // Normalize to same unit
  const firstWeight = firstEntry.unit === 'kg'
    ? firstEntry.weight * 2.20462
    : firstEntry.weight;
  const lastWeight = lastEntry.unit === 'kg'
    ? lastEntry.weight * 2.20462
    : lastEntry.weight;

  const change = lastWeight - firstWeight;
  const daysDiff = Math.max(1, (new Date(lastEntry.date).getTime() - new Date(firstEntry.date).getTime()) / (1000 * 60 * 60 * 24));
  const rate = change / daysDiff; // lbs per day

  let trend: 'gaining' | 'losing' | 'stable' = 'stable';
  if (Math.abs(rate) < 0.05) {
    trend = 'stable';
  } else if (rate > 0) {
    trend = 'gaining';
  } else {
    trend = 'losing';
  }

  return { rate, trend };
}

/**
 * Format body weight for display
 */
export function formatBodyWeight(weight: number, unit: 'lbs' | 'kg' = 'lbs'): string {
  return `${weight.toFixed(1)} ${unit}`;
}

/**
 * Format body measurement for display
 */
export function formatMeasurement(value: number, unit: 'in' | 'cm' = 'in'): string {
  return `${value.toFixed(1)} ${unit}`;
}

/**
 * Format body fat percentage
 */
export function formatBodyFat(percentage: number): string {
  return `${percentage.toFixed(1)}%`;
}
