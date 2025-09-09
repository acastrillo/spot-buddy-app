import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from 'fs';
import { join } from 'path';

const glossary = JSON.parse(readFileSync(join(process.cwd(), 'data/spotter_glossary.json'), 'utf8'));
import { buildRefIndex, parseInstagramCaption } from "@/lib/igParser";
import { layeredRepair } from "@/lib/llm/router";
import { deepMergeAst } from "@/lib/llm/merge";
import { reify } from "@/lib/workout/reify";

const ref = buildRefIndex(glossary);
const CONF_GATE = Number(process.env.CONFIDENCE_GATE || 0.8);

function freeSummary(ast:any){
  const blocks = ast.blocks?.length || 0;
  const rounds = ast.blocks?.map((b:any)=>b.mode?.rounds ?? b.rounds ?? 1).reduce((a:number,b:number)=>a+b,0) || 0;
  const firstWin = ast.blocks?.find((b:any)=>b.mode?.windowSec)?.mode?.windowSec;
  const win = firstWin ? `${Math.round(firstWin/60)}:00` : (ast.blocks?.[0]?.interval ? `${ast.blocks[0].interval.workSec}s/${ast.blocks[0].interval.restSec||0}s` : 'interval');
  return {
    summary: `Structured interval workout with ${blocks} block${blocks>1?'s':''} (${rounds} total rounds, ${win} windows).`,
    breakdown: ast.blocks?.map((b:any,i:number)=>{
      const r = b.mode?.rounds ?? b.rounds ?? 1;
      const w = b.mode?.windowSec ? `${Math.round(b.mode.windowSec/60)}:00` : (b.interval ? `${b.interval.workSec}s/${b.interval.restSec||0}s` : 'n/a');
      const mv = b.sequence?.map((m:any)=>m.name).join(', ') || 'unknown';
      return `Block ${i+1}: ${r} rounds • window ${w} • ${mv}`;
    }) || []
  };
}

export async function POST(req: NextRequest){
  try {
    const { caption, url } = await req.json();

    if (!caption) {
      return NextResponse.json({ error: "Caption is required" }, { status: 400 });
    }

    const parsed = parseInstagramCaption(caption, ref, { platform:'instagram', url });
    let ast = parsed.ast;

    if ((ast.confidence ?? 0) >= CONF_GATE){
      const { rows, workoutV1 } = reify(ast);
      const { summary, breakdown } = freeSummary(ast);
      return NextResponse.json({ ast, rows, workoutV1, summary, breakdown, usedLLM:false });
    }

    // Only use LLM if we have an OpenAI API key
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-key-here') {
      const { rows, workoutV1 } = reify(ast);
      const { summary, breakdown } = freeSummary(ast);
      return NextResponse.json({ 
        ast, rows, workoutV1, summary, breakdown, 
        usedLLM: false,
        warning: "OpenAI API key not configured - using deterministic parser only"
      });
    }

    const { used, result } = await layeredRepair({
      caption, ast, glossary, deterministicConfidence: ast.confidence ?? 0
    });

    const patched = deepMergeAst(ast, result?.patchedAst || {});
    const { rows, workoutV1 } = reify(patched);

    return NextResponse.json({
      ast: patched, rows, workoutV1,
      summary: result?.summary, breakdown: result?.breakdown,
      exercises: result?.exercises || [], // Include extracted exercises
      usedLLM: used
    });

  } catch (error) {
    console.error('Error processing workout:', error);
    return NextResponse.json(
      { error: "Failed to process workout" },
      { status: 500 }
    );
  }
}