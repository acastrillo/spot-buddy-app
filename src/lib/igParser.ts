export function buildRefIndex(glossary: any) {
  const index: any = {};
  
  // Build reference index from glossary for quick lookups
  Object.entries(glossary.movements || {}).forEach(([canonical, aliases]) => {
    index[canonical] = canonical;
    (aliases as string[]).forEach(alias => {
      index[alias.toLowerCase()] = canonical;
    });
  });
  
  Object.entries(glossary.equipment || {}).forEach(([canonical, aliases]) => {
    index[canonical] = canonical;
    (aliases as string[]).forEach(alias => {
      index[alias.toLowerCase()] = canonical;
    });
  });
  
  return index;
}

export function parseInstagramCaption(caption: string, refIndex: any, options?: any) {
  // Mock deterministic parser - in real implementation this would be much more sophisticated
  const lines = caption.toLowerCase().split('\n').filter(line => line.trim());
  
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
    
    // Extract movements (basic pattern matching)
    lines.forEach(line => {
      const repMatch = line.match(/(\d+)\s*(.+)/);
      if (repMatch) {
        const reps = parseInt(repMatch[1]);
        const movement = repMatch[2].trim();
        
        // Try to canonicalize movement name
        const canonical = refIndex[movement] || movement;
        
        block.sequence.push({
          name: canonical,
          reps: reps,
          sets: 1
        });
      } else {
        // Look for exercise names without reps (like emoji lists)
        const exerciseMatch = line.match(/[🔥💪🏋️➡️✅⚡🎯🔢\d️⃣]*\s*(.+)/);
        if (exerciseMatch) {
          const movement = exerciseMatch[1].trim();
          if (movement && movement.length > 2) {
            const canonical = refIndex[movement.toLowerCase()] || movement;
            
            // Avoid duplicates and non-exercise words
            if (!block.sequence.find((ex: any) => ex.name === canonical) && 
                !['work', 'rest', 'seconds', 'complete', 'sets'].includes(canonical.toLowerCase())) {
              block.sequence.push({
                name: canonical,
                reps: null,
                sets: 1
              });
            }
          }
        }
      }
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