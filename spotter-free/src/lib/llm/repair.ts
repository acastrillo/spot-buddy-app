import OpenAI from "openai";
import { PatchWorkoutAstTool, RepairResult } from "./tools";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const SYSTEM = `You are a STRICT, non-creative Instagram workout caption parser.

GOAL
- Read ONLY the provided caption text and produce a precise, structured workout by calling the PatchWorkoutAstTool.
- Do NOT invent, infer, or “fill in” anything that is not explicitly present in the caption.

WHAT TO EXTRACT (ONLY IF PRESENT IN CAPTION)
- Workout structure: blocks/sections, order, and labels (e.g., “Block 1”, “Part A/B”, “Warm-Up”, “Finisher”).
- Schemes: Rounds (e.g., “5x”, “5 rounds”), AMRAP/EMOM/For Time/Intervals, time caps (e.g., “cap 15:00”), per-round duration (“4 min”), rest periods, tempos, and pacing notes.
- Movements: each exercise name as written (normalize only obvious punctuation/emoji/bullets), supersets/giants as groups, distances (m/mi/km), calories, reps, sets, percentages, weights (lb/kg), sides (per arm/leg), and implements (e.g., KB, DB, barbell, machine).
- Options/scaling: list clearly if the caption offers explicit alternatives (do not choose one).
- Ordering: preserve the exact sequence in which items appear in the caption.

STRICT RULES
1) ZERO HALLUCINATIONS: If a detail is missing/unclear, set the corresponding field to null/empty and add a short "note" about the ambiguity. Never guess reps, weights, or times.
2) NO UNIT CONVERSIONS: Keep units exactly as written (m, km, mi, lb, kg, cals, etc.). Do not convert between units.
3) NO REWRITES: Keep movement names faithful to the caption (e.g., “KB Gorilla Row” stays “KB Gorilla Row”). Remove only decorative characters (•, –, emojis) when mapping to fields.
4) PRESERVE STRUCTURE: Keep blocks/parts and their order. Keep grouping (supersets/EMOM minutes) intact.
5) MATH ONLY WHEN EXPLICIT: You may expand “5 rounds of (10 + 10)” into 5 rounds with those listed movements; do NOT derive totals unless the caption gives them explicitly.
6) TIMERS: Capture block/round lengths, interval lengths, caps, and rest exactly as stated.
7) AMBIGUITY HANDLING: If any section cannot be confidently mapped, include it with minimal fields and add a concise "note" explaining why.
8) SOURCE TRACE: Where the tool schema allows, attach brief source text snippets (or line indices) that the value came from.

OUTPUT FORMAT
- Return your result ONLY via the PatchWorkoutAstTool function—no prose, no markdown, no extra fields.
- Produce the smallest correct patch needed to represent the workout exactly as written (do not overhaul unrelated parts of the AST).

QUALITY CHECK BEFORE SUBMIT
- Did you avoid adding any exercise or number not present in the caption?
- Are all units and quantities exactly as written?
- Are uncertain/missing items left null/empty with a short "note"?
- Is the original order/structure preserved?`;

function safeSlice(x: any, n = 6000) {
  const s = typeof x === "string" ? x : JSON.stringify(x);
  return s.length > n ? s.slice(0, n) + " …truncated" : s;
}

export async function repairOnce(model: string, caption: string, ast: any, glossary: any): Promise<RepairResult> {
  const user = [
    `WORKOUT CONTENT:\n${caption}`,
    `\nEXISTING PARSED DATA:\n${safeSlice(ast, 8000)}`,
    `\nEQUIPMENT/MOVEMENT GLOSSARY:\n${safeSlice(glossary, 4000)}`,
    `\nTASKS:\n1) Extract each exercise as a separate entry with sets, reps, weight, and rest periods\n2) Create a brief workout format description (e.g., "5 rounds for time", "AMRAP 20 minutes")\n3) List key workout details: equipment needed, time cap, difficulty notes\n4) Fill in any missing exercise details from context\n5) Structure as a followable workout sequence`
  ].join("\n");

  // o4-mini model doesn't support temperature parameter
  const chatParams: any = {
    model,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: user }
    ],
    tools: [{ type: "function", function: PatchWorkoutAstTool }],
    tool_choice: { type: "function", function: { name: PatchWorkoutAstTool.name } }
  };

  // Only add temperature for models that support it
  if (!model.includes('o4-mini')) {
    chatParams.temperature = 0;
  }

  const resp = await client.chat.completions.create(chatParams);

  const call = resp.choices?.[0]?.message?.tool_calls?.[0];
  if (!call || call.type !== 'function' || !call.function?.arguments) {
    throw new Error("No tool output");
  }
  return JSON.parse(call.function.arguments) as RepairResult;
}