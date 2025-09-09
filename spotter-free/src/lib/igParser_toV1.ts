export function toWorkoutV1(ast: any, rows: any[]) {
  // Convert AST to WorkoutV1 format
  const workout = {
    id: `workout-${Date.now()}`,
    name: generateWorkoutName(ast),
    description: generateDescription(ast),
    exercises: rows.map(row => ({
      id: row.id,
      name: row.movement,
      sets: row.sets || 1,
      reps: row.reps || '',
      weight: row.weight || '',
      restSeconds: 60, // Default rest
      notes: row.notes || ''
    })),
    totalDuration: estimateDuration(ast),
    difficulty: 'moderate',
    tags: extractTags(ast),
    createdAt: new Date().toISOString(),
    source: ast.source || 'instagram',
    url: ast.url
  };
  
  return workout;
}

function generateWorkoutName(ast: any): string {
  if (ast.blocks?.length > 0) {
    const firstBlock = ast.blocks[0];
    if (firstBlock.mode?.type) {
      return `${firstBlock.mode.type} Workout`;
    }
  }
  return 'Custom Workout';
}

function generateDescription(ast: any): string {
  const blocks = ast.blocks?.length || 0;
  const totalMovements = ast.blocks?.reduce((sum: number, block: any) => 
    sum + (block.sequence?.length || 0), 0) || 0;
  
  return `${blocks} block workout with ${totalMovements} exercises`;
}

function estimateDuration(ast: any): number {
  // Estimate workout duration in minutes
  let duration = 0;
  
  ast.blocks?.forEach((block: any) => {
    if (block.mode?.windowSec) {
      duration += block.mode.windowSec / 60;
    } else if (block.interval && block.rounds) {
      // Interval training calculation
      const cycleTime = block.interval.workSec + block.interval.restSec;
      const exerciseCount = block.sequence?.length || 1;
      duration += (cycleTime * exerciseCount * block.rounds) / 60;
    } else {
      // Estimate based on exercise count
      const exercises = block.sequence?.length || 0;
      duration += exercises * 2; // ~2 minutes per exercise
    }
  });
  
  return Math.max(duration, 15); // Minimum 15 minutes
}

function extractTags(ast: any): string[] {
  const tags: string[] = [];
  
  ast.blocks?.forEach((block: any) => {
    if (block.mode?.type) {
      tags.push(block.mode.type);
    }
  });
  
  return [...new Set(tags)]; // Remove duplicates
}