import { astToRows } from "@/lib/igParser";
import { toWorkoutV1 } from "@/lib/igParser_toV1";

export function reify(ast:any){
  const rows = astToRows(ast);
  const workoutV1 = toWorkoutV1(ast, rows);
  return { rows, workoutV1 };
}