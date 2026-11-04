// Original identifier names of a minified npm build, read from its source map.
//   import { sourceMapNames } from './vendor-sourcemap.mjs'
//   const at = sourceMapNames(mapJson)   // null when the map has no names
//   at(line1, col0) → original name of the identifier generated at that position, or undefined
// Only segments that carry a name index are kept (bundlers emit one for every
// renamed identifier). Lines are 1-based and columns 0-based, as in Babel's loc.
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const VAL = new Int8Array(128).fill(-1);
for (let i = 0; i < B64.length; i++) VAL[B64.charCodeAt(i)] = i;

export function sourceMapNames(map) {
  if (!map || !Array.isArray(map.names) || !map.names.length || typeof map.mappings !== 'string') return null;
  const s = map.mappings;
  const lines = []; // line index -> Map(col -> nameIdx)
  let line = 0, col = 0, src = 0, sline = 0, scol = 0, name = 0;
  let cur = null;
  let i = 0;
  const fields = [0, 0, 0, 0, 0];
  while (i <= s.length) {
    const ch = i < s.length ? s.charCodeAt(i) : 59; // ';' at the end
    if (ch === 59 /* ; */) { line++; col = 0; cur = null; i++; continue; }
    if (ch === 44 /* , */) { i++; continue; }
    let n = 0;
    while (i < s.length && s.charCodeAt(i) !== 44 && s.charCodeAt(i) !== 59) {
      let shift = 0, value = 0, digit;
      do {
        digit = VAL[s.charCodeAt(i++)];
        if (digit < 0) return null;
        value += (digit & 31) << shift;
        shift += 5;
      } while (digit & 32);
      fields[n++] = value & 1 ? -(value >>> 1) : value >>> 1;
    }
    col += fields[0];
    if (n >= 4) { src += fields[1]; sline += fields[2]; scol += fields[3]; }
    if (n >= 5) {
      name += fields[4];
      if (!cur) { cur = new Map(); lines[line] = cur; }
      cur.set(col, name);
    }
  }
  return (line1, col0) => {
    const m = lines[line1 - 1];
    if (!m) return undefined;
    const k = m.get(col0);
    return k === undefined ? undefined : map.names[k];
  };
}
