/**
 * commands/plan/_new/plan.helpers-h6f3.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-h6f3feta.js (1)
 * attribution: sole-consumer-new 1
 */
import { renderToAnsiString } from "../../../utils/staticRender.js";
import { Yn } from "../../../utils/stripAnsi.js";

//@ chunk-h6f3feta.js:1126-1184 sole-consumer-new
async function QFn(r, t) {
  let n = await renderToAnsiString(r, t);
  return Yn(n);
}

export { QFn };
