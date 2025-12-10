import glossary from "../../data/spotter_glossary.json";

export function buildRefIndex(glossaryData: any) {
  const index: Record<string, string> = {};
  const lower = (s: string) => s.toLowerCase();

  const add = (canonical: string, alias: string) => {
    index[lower(alias)] = canonical;
  };
  
  Object.entries(glossaryData.movements || {}).forEach(([canonical, aliases]) => {
    add(canonical, canonical);
    (aliases as string[]).forEach(alias => add(canonical, alias));
  });
  
  Object.entries(glossaryData.equipment || {}).forEach(([canonical, aliases]) => {
    add(canonical, canonical);
    (aliases as string[]).forEach(alias => add(canonical, alias));
  });
  
  return index;
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findMovement(line: string, refIndex: Record<string, string>) {
  const lowerLine = line.toLowerCase();
  for (const alias of Object.keys(refIndex)) {
    const regex = new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'i');
    if (regex.test(lowerLine)) return refIndex[alias];
  }
  return null;
}

function extractRepDetails(line: string) {
  const lower = line.toLowerCase();
  const result: { reps?: string; sets?: number; values?: number[] } = {};

  const ladderMatch = lower.match(/\b(\d+(?:-\d+)+)\b/);
  if (ladderMatch) {
    const values = ladderMatch[1].split('-').map(Number).filter(Boolean);
    result.values = values;
    result.reps = values.join('-');
    result.sets = values.length;
    return result;
  }

  const setRepMatch = lower.match(/(\d+)\s*[xX]\s*(\d+)/);
  if (setRepMatch) {
    result.sets = parseInt(setRepMatch[1]);
    result.reps = setRepMatch[2];
    return result;
  }

  const roundsMatch = lower.match(/(\d+)\s*(?:rounds?|sets?)/);
  if (roundsMatch) {
    result.sets = parseInt(roundsMatch[1]);
  }

  const unitNumber = lower.match(/(\d+)\s*(calories?|cals?|cal|meters?|metres?|m\b|km|reps?|rep\b|sec|secs|seconds?|minutes?|mins?|min)\b/);
  if (unitNumber) {
    result.reps = `${unitNumber[1]} ${unitNumber[2]}`.replace(/\s+/g, ' ').trim();
    return result;
  }

  const attachedUnit = lower.match(/(\d+)(m|km|cal|cals|reps?|sec|secs|min|mins)/);
  if (attachedUnit) {
    result.reps = `${attachedUnit[1]} ${attachedUnit[2]}`;
    return result;
  }

  const genericNumber = lower.match(/(\d+)/);
  if (genericNumber) {
    result.reps = genericNumber[1];
  }

  return result;
}

export function parseInstagramCaption(caption: string, refIndex: any, options?: any) {
  // Movement-gated parser - only create cards when a known movement is matched
  const index = refIndex || buildRefIndex(glossary);
  const lines = caption
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => !line.startsWith('#') && !line.startsWith('@'));
  
  const ast: any = {
    blocks: [],
    confidence: 0.3, // Low confidence to trigger LLM
    source: options?.platform || 'instagram',
    url: options?.url
  };
  
  // Look for workout patterns
  const emomMatch = caption.match(/E(\d+)MOM|EMOM/i);
  const amrapMatch = caption.match(/(\d+)\s*min\s*AMRAP|AMRAP/i);
  const forTimeMatch = caption.match(/for\s*time/i);
  const intervalMatch = caption.match(/(\d+)\s*seconds?\s*work.*?(\d+)\s*seconds?\s*rest/i);
  
  if (emomMatch || amrapMatch || forTimeMatch || intervalMatch) {
    const block: any = {
      sequence: [],
      mode: {}
    };
    
    if (emomMatch) {
      const interval = emomMatch[1] ? parseInt(emomMatch[1]) : 1;
      block.mode = { type: 'EMOM', windowSec: interval * 60 };
    } else if (amrapMatch) {
      const duration = amrapMatch[1] ? parseInt(amrapMatch[1]) : 12;
      block.mode = { type: 'AMRAP', windowSec: duration * 60 };
    } else if (intervalMatch) {
      const workSec = parseInt(intervalMatch[1]);
      const restSec = parseInt(intervalMatch[2]);
      block.mode = { type: 'Interval' };
      block.interval = { workSec, restSec };
      
      // Look for sets/rounds
      const setsMatch = caption.match(/(\d+)\s*sets?/i);
      if (setsMatch) {
        block.rounds = parseInt(setsMatch[1]);
      }
    } else {
      block.mode = { type: 'For Time' };
    }
    
    // Extract movements (only when a known movement is present)
    lines.forEach(line => {
      const canonical = findMovement(line, index);
      if (!canonical) return;

      const repsInfo = extractRepDetails(line);

      block.sequence.push({
        name: canonical,
        reps: repsInfo.reps || null,
        sets: repsInfo.sets || 1,
        values: repsInfo.values || undefined
      });
    });
    
    if (block.sequence.length > 0) {
      ast.blocks.push(block);
      ast.confidence = 0.6; // Slightly higher if we found structure
    }
  }
  
  return { ast };
}

export function astToRows(ast: any) {
  // Convert AST to rows format for display
  const rows: any[] = [];
  
  ast.blocks?.forEach((block: any, blockIndex: number) => {
    block.sequence?.forEach((movement: any, movIndex: number) => {
      rows.push({
        id: `${blockIndex}-${movIndex}`,
        movement: movement.name,
        reps: movement.reps || '',
        sets: movement.sets || 1,
        weight: movement.weight || '',
        notes: movement.notes || ''
      });
    });
  });
  
  return rows;
}
