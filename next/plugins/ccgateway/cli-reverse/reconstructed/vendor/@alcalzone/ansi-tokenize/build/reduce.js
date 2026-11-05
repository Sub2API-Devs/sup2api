/**
 * @alcalzone/ansi-tokenize/build/reduce.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @alcalzone/ansi-tokenize@0.2.2
 * pieces: chunk-ngeq6w7y.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { endCodesSource, endCodesSet } from "./ansiCodes.js";

//@ chunk-ngeq6w7y.js:3428-3459 esm-layout
function reduceAnsiCodes(codes) {
  return reduceAnsiCodesIncremental([], codes);
}
//@ chunk-ngeq6w7y.js:3459-3771 esm-fingerprint
function reduceAnsiCodesIncremental(codes, newCodes) {
  let ret = [...codes];
  for (let code of newCodes)
    if (code.code === endCodesSource.reset.open) ret = [];
    else if (endCodesSet.has(code.code)) ret = ret.filter((retCode) => retCode.endCode !== code.code);
    else if (code.code === endCodesSource.bold.open || code.code === endCodesSource.dim.open) {
      if (!ret.find((retCode) => retCode.code === code.code && retCode.endCode === code.endCode))
        ret.push(code);
    } else {
      ret = ret.filter((retCode) => retCode.endCode !== code.endCode);
      ret.push(code);
    }
  return ret;
}
export { reduceAnsiCodes };
