/**
 * lodash-es/_baseMerge.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-dcmhvw5a.js (1)
 * attribution: placement 1
 */
import { Pn } from "./_inlinedHelpers.js";
import { q8e, RR } from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { mergeDeep_2, safeGet_2, safeSet_2 } from "../../src/utils/settings/settingsSourceTrust.js";
import { keysInAlias } from "../../src/utils/git/gitSafeEnv.js";

//@ chunk-dcmhvw5a.js:143313-143493 placement
function baseMerge(object, source, srcIndex, customizer, stack) {
  if (object === source) return;
  Pn(
    source,
    function (srcValue, key) {
      if (!stack) stack = new q8e();
      if (RR(srcValue)) mergeDeep_2(object, source, key, srcIndex, baseMerge, customizer, stack);
      else {
        var newValue = customizer
          ? customizer(safeGet_2(object, key), srcValue, key + "", object, source, stack)
          : undefined;
        if (newValue === undefined) newValue = srcValue;
        safeSet_2(object, key, newValue);
      }
    },
    keysInAlias,
  );
}
export { baseMerge };
