/**
 * utils/stableHash.ts
 *
 * 2.1.316 新增：稳定哈希
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ay9hyszk.js (4)
 * attribution: placement 4
 */
import { createHash } from "crypto";
import { jsonStringify, jsonParse } from "./slowOperations.js";

//@ chunk-ay9hyszk.js:508-517 placement
var S = 32;
//@ chunk-ay9hyszk.js:517-608 placement
function N6(e, r) {
  return createHash("sha256")
    .update(e)
    .update("\x00")
    .update(jsonStringify(sortKeysDeep(r)))
    .digest("hex");
}
//@ chunk-ay9hyszk.js:608-836 placement
function sortKeysDeep(e, r = 0) {
  if (r > S) return e;
  if (Array.isArray(e)) return e.map((n) => sortKeysDeep(n, r + 1));
  if (typeof e === "object" && e !== null)
    return Object.fromEntries(
      Object.entries(e)
        .sort(([n], [o]) => (n < o ? -1 : n > o ? 1 : 0))
        .map(([n, o]) => [n, sortKeysDeep(o, r + 1)]),
    );
  return e;
}
//@ chunk-ay9hyszk.js:836-884 placement
function BVt(e, r) {
  let n = jsonParse(jsonStringify(r));
  return N6(e, n);
}

export { BVt, N6 };
