/**
 * hooks/_new/useVimInput.helpers-530h.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-530hfzwb.js (3)
 * attribution: sole-consumer-new 3
 */
import { j, Se, P } from "../../../vendor/react/cjs/react.production.js";
import { kp } from "../../../vendor/convert-to-spaces/dist/index.js";

//@ chunk-530hfzwb.js:672-676 sole-consumer-new
j();
//@ chunk-530hfzwb.js:676-680 sole-consumer-new
j();
//@ chunk-530hfzwb.js:680-745 sole-consumer-new
function dt(e) {
  let { watchLoop: watchLoop } = Se(kp);
  P(() => (e ? watchLoop() : void 0), [e, watchLoop]);
}

export { dt };
