/**
 * code-excerpt/dist/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: code-excerpt@4.0.0
 * pieces: chunk-bzr73sfg.js (1)
 * attribution: esm-layout 1
 */
import { Wg } from "../../convert-to-spaces/dist/index.js";

//@ chunk-bzr73sfg.js:224159-224554 esm-layout
var U1 = (n, u) => {
    let f = [],
      m = n - u,
      p = n + u;
    for (let g = m; g <= p; g++) f.push(g);
    return f;
  },
  I1 = (n, u, f = {}) => {
    var m;
    if (typeof n !== "string") throw TypeError("Source code is missing.");
    if (!u || u < 1) throw TypeError("Line number must start from `1`.");
    let parts = Wg(n).split(/\r?\n/);
    if (u > parts.length) return;
    return U1(u, (m = f.around) !== null && m !== void 0 ? m : 3)
      .filter((g) => parts[g - 1] !== void 0)
      .map((g) => ({ line: g, value: parts[g - 1] }));
  },
  Wd = I1;

export { Wd };
