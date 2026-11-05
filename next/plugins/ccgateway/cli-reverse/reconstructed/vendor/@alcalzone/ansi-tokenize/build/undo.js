/**
 * @alcalzone/ansi-tokenize/build/undo.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @alcalzone/ansi-tokenize@0.2.2
 * pieces: chunk-ngeq6w7y.js (1)
 * attribution: esm-fingerprint 1
 */
import { reduceAnsiCodes } from "./reduce.js";

//@ chunk-ngeq6w7y.js:3771-3845 esm-fingerprint
function undoAnsiCodes(codes) {
  return reduceAnsiCodes(codes)
    .reverse()
    .map((code) => ({
      ...code,
      code: code.endCode,
    }));
}
export { undoAnsiCodes };
