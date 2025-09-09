export function deepMergeAst(base:any, patch:any){
  if (Array.isArray(base) && Array.isArray(patch)) return patch;
  if (base && typeof base === 'object' && patch && typeof patch === 'object'){
    const out = { ...base };
    for (const k of Object.keys(patch)) out[k] = deepMergeAst(base[k], patch[k]);
    return out;
  }
  return patch === undefined ? base : patch;
}