export const PatchWorkoutAstTool = {
  name: "patch_workout_ast",
  description: "Extract and structure workout exercises into a followable format.",
  parameters: {
    type: "object",
    properties: {
      patchedAst: { 
        type: "object", 
        description: "Enhanced AST with extracted exercise data and workout structure." 
      },
      summary: { type: "string", description: "Brief workout format description (e.g. '5 rounds for time', 'AMRAP 20 min')." },
      breakdown: { type: "array", items: { type: "string" }, description: "Key workout details: equipment, time cap, rest periods, difficulty notes" },
      exercises: {
        type: "array",
        description: "Structured list of exercises extracted from the workout",
        items: {
          type: "object",
          properties: {
            movement: { type: "string", description: "Exercise name" },
            sets: { type: "number", description: "Number of sets" },
            reps: { type: "string", description: "Reps or time (e.g. '10', '30 sec', '400m')" },
            weight: { type: "string", description: "Weight or resistance" },
            restSeconds: { type: "number", description: "Rest between sets in seconds" },
            notes: { type: "string", description: "Additional instructions or modifications" }
          },
          required: ["movement"]
        }
      },
      patchConfidence: { type: "number", minimum: 0, maximum: 1 },
      needsUpgrade: { type: "boolean" }
    },
    required: ["patchedAst","summary","breakdown","exercises","patchConfidence","needsUpgrade"]
  }
} as const;

export type RepairResult = {
  patchedAst: any;
  summary: string;
  breakdown: string[];
  exercises: Array<{
    movement: string;
    sets?: number;
    reps?: string;
    weight?: string;
    restSeconds?: number;
    notes?: string;
  }>;
  patchConfidence: number;
  needsUpgrade: boolean;
};