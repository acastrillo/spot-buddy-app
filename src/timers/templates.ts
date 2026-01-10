/**
 * Timer Templates
 *
 * Pre-configured timer templates for common workout formats.
 * Platform-agnostic - zero browser/DOM dependencies.
 */

import type { TimerTemplate, TimerParams } from './types';

// ============================================================================
// Timer Template Definitions
// ============================================================================

export const TIMER_TEMPLATES: TimerTemplate[] = [
  // EMOM Templates
  {
    id: 'EMOM_BASIC',
    type: 'EMOM',
    category: 'INTERVAL',
    name: 'EMOM',
    description: 'Every Minute On the Minute - Complete work within each minute, rest for remainder',
    defaultParams: {
      kind: 'EMOM',
      intervalSeconds: 60,
      totalMinutes: 12,
    },
    paramSchema: {
      fields: [
        {
          name: 'totalMinutes',
          label: 'Total Minutes',
          type: 'integer',
          min: 1,
          max: 60,
          step: 1,
          default: 12,
        },
        {
          name: 'intervalSeconds',
          label: 'Interval Length (seconds)',
          type: 'integer',
          min: 15,
          max: 180,
          step: 5,
          default: 60,
        },
      ],
    },
    recommendedFor: ['hyrox', 'metcon', 'conditioning'],
  },

  {
    id: 'EMOM_20MIN',
    type: 'EMOM',
    category: 'INTERVAL',
    name: 'EMOM 20',
    description: '20-minute EMOM for extended conditioning work',
    defaultParams: {
      kind: 'EMOM',
      intervalSeconds: 60,
      totalMinutes: 20,
    },
    paramSchema: {
      fields: [
        {
          name: 'totalMinutes',
          label: 'Total Minutes',
          type: 'integer',
          min: 1,
          max: 60,
          step: 1,
          default: 20,
        },
        {
          name: 'intervalSeconds',
          label: 'Interval Length (seconds)',
          type: 'integer',
          min: 15,
          max: 180,
          step: 5,
          default: 60,
        },
      ],
    },
    recommendedFor: ['hyrox', 'metcon', 'endurance'],
  },

  // AMRAP Templates
  {
    id: 'AMRAP_12',
    type: 'AMRAP',
    category: 'INTERVAL',
    name: '12 min AMRAP',
    description: 'Complete as many rounds as possible in 12 minutes',
    defaultParams: {
      kind: 'AMRAP',
      durationSeconds: 12 * 60,
    },
    paramSchema: {
      fields: [
        {
          name: 'durationSeconds',
          label: 'Duration (seconds)',
          type: 'integer',
          min: 60,
          max: 3600,
          step: 30,
          default: 720,
        },
      ],
    },
    recommendedFor: ['hyrox', 'metcon', 'conditioning'],
  },

  {
    id: 'AMRAP_20',
    type: 'AMRAP',
    category: 'INTERVAL',
    name: '20 min AMRAP',
    description: 'Complete as many rounds as possible in 20 minutes',
    defaultParams: {
      kind: 'AMRAP',
      durationSeconds: 20 * 60,
    },
    paramSchema: {
      fields: [
        {
          name: 'durationSeconds',
          label: 'Duration (seconds)',
          type: 'integer',
          min: 60,
          max: 3600,
          step: 30,
          default: 1200,
        },
      ],
    },
    recommendedFor: ['hyrox', 'metcon', 'endurance'],
  },

  // Interval Work/Rest Templates
  {
    id: 'INTERVAL_40_20_X10',
    type: 'INTERVAL_WORK_REST',
    category: 'INTERVAL',
    name: '40/20 x10',
    description: 'Classic 40s work, 20s rest, for 10 rounds',
    defaultParams: {
      kind: 'INTERVAL_WORK_REST',
      workSeconds: 40,
      restSeconds: 20,
      totalRounds: 10,
    },
    paramSchema: {
      fields: [
        {
          name: 'workSeconds',
          label: 'Work (seconds)',
          type: 'integer',
          min: 5,
          max: 600,
          step: 5,
          default: 40,
        },
        {
          name: 'restSeconds',
          label: 'Rest (seconds)',
          type: 'integer',
          min: 0,
          max: 600,
          step: 5,
          default: 20,
        },
        {
          name: 'totalRounds',
          label: 'Total Rounds',
          type: 'integer',
          min: 1,
          max: 100,
          step: 1,
          default: 10,
        },
      ],
    },
    recommendedFor: ['hyrox', 'metcon', 'conditioning'],
  },

  {
    id: 'INTERVAL_30_30_X8',
    type: 'INTERVAL_WORK_REST',
    category: 'INTERVAL',
    name: '30/30 x8',
    description: 'Equal work and rest intervals - 30s on, 30s off, for 8 rounds',
    defaultParams: {
      kind: 'INTERVAL_WORK_REST',
      workSeconds: 30,
      restSeconds: 30,
      totalRounds: 8,
    },
    paramSchema: {
      fields: [
        {
          name: 'workSeconds',
          label: 'Work (seconds)',
          type: 'integer',
          min: 5,
          max: 600,
          step: 5,
          default: 30,
        },
        {
          name: 'restSeconds',
          label: 'Rest (seconds)',
          type: 'integer',
          min: 0,
          max: 600,
          step: 5,
          default: 30,
        },
        {
          name: 'totalRounds',
          label: 'Total Rounds',
          type: 'integer',
          min: 1,
          max: 100,
          step: 1,
          default: 8,
        },
      ],
    },
    recommendedFor: ['conditioning', 'cardio'],
  },

  // Tabata Templates
  {
    id: 'TABATA_CLASSIC',
    type: 'TABATA',
    category: 'INTERVAL',
    name: 'Tabata (20/10 x8)',
    description: 'Classic Tabata protocol - 20s all-out work, 10s rest, for 8 rounds',
    defaultParams: {
      kind: 'TABATA',
      workSeconds: 20,
      restSeconds: 10,
      rounds: 8,
    },
    paramSchema: {
      fields: [
        {
          name: 'workSeconds',
          label: 'Work (seconds)',
          type: 'integer',
          min: 5,
          max: 60,
          step: 5,
          default: 20,
        },
        {
          name: 'restSeconds',
          label: 'Rest (seconds)',
          type: 'integer',
          min: 5,
          max: 60,
          step: 5,
          default: 10,
        },
        {
          name: 'rounds',
          label: 'Rounds',
          type: 'integer',
          min: 1,
          max: 20,
          step: 1,
          default: 8,
        },
      ],
    },
    recommendedFor: ['hiit', 'metcon', 'conditioning'],
  },

  {
    id: 'TABATA_EXTENDED',
    type: 'TABATA',
    category: 'INTERVAL',
    name: 'Extended Tabata (30/15 x8)',
    description: 'Extended Tabata - 30s work, 15s rest, for 8 rounds',
    defaultParams: {
      kind: 'TABATA',
      workSeconds: 30,
      restSeconds: 15,
      rounds: 8,
    },
    paramSchema: {
      fields: [
        {
          name: 'workSeconds',
          label: 'Work (seconds)',
          type: 'integer',
          min: 5,
          max: 60,
          step: 5,
          default: 30,
        },
        {
          name: 'restSeconds',
          label: 'Rest (seconds)',
          type: 'integer',
          min: 5,
          max: 60,
          step: 5,
          default: 15,
        },
        {
          name: 'rounds',
          label: 'Rounds',
          type: 'integer',
          min: 1,
          max: 20,
          step: 1,
          default: 8,
        },
      ],
    },
    recommendedFor: ['hiit', 'conditioning'],
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a timer template by ID
 */
export function getTimerTemplateById(id: string): TimerTemplate | undefined {
  return TIMER_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get all templates for a specific timer type
 */
export function getTemplatesByType(type: string): TimerTemplate[] {
  return TIMER_TEMPLATES.filter((t) => t.type === type);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): TimerTemplate[] {
  return TIMER_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get templates recommended for specific tags
 */
export function getTemplatesByTags(tags: string[]): TimerTemplate[] {
  return TIMER_TEMPLATES.filter((t) =>
    t.recommendedFor.some((tag) => tags.includes(tag))
  );
}

/**
 * Safely merge custom params onto default params
 */
export function mergeTimerParams<T extends TimerParams>(
  defaultParams: T,
  overrides: Partial<T> | undefined
): T {
  return {
    ...defaultParams,
    ...(overrides ?? {}),
  };
}
