import { repairOnce } from "./repair";
import { RepairResult } from "./tools";

const CHEAP  = process.env.OPENAI_MODEL_CHEAP  || "gpt-4o-mini";
const STRONG = process.env.OPENAI_MODEL_STRONG || "o4-mini";
const CONF_GATE = Number(process.env.CONFIDENCE_GATE || 0.8);

const empty = (x:any) => !x || Object.keys(x).length === 0;

export async function layeredRepair({
  caption, ast, glossary, deterministicConfidence
}: { caption:string; ast:any; glossary:any; deterministicConfidence:number }) {
  if (deterministicConfidence >= CONF_GATE) return { used:"none", result:null as any };

  const cheap = await repairOnce(CHEAP, caption, ast, glossary);
  const bad = cheap.needsUpgrade || cheap.patchConfidence < 0.7 || empty(cheap.patchedAst);

  if (!bad) return { used: CHEAP, result: cheap };

  const strong = await repairOnce(STRONG, caption, ast, glossary);
  return { used: STRONG, result: strong };
}