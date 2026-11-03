/**
 * lodash-es/_baseKeysIn.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-3a1caa6f.js (1)
 * attribution: placement 1
 */
import { RR } from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { c, hasOwnProperty_2 } from "../../src/utils/git/gitSafeEnv.js";
import { X8e } from "./_isPrototype.js";

//@ chunk-3a1caa6f.js:892-1022 placement
function baseKeysIn(e) {
  if (!RR(e)) return c(e);
  var r = X8e(e),
    n = [];
  for (var key in e) if (!(key == "constructor" && (r || !hasOwnProperty_2.call(e, key)))) n.push(key);
  return n;
}

export { baseKeysIn };
