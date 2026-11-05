/**
 * lodash-es/_baseMerge.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-z20c443b.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { baseEachAlias } from "./_inlinedHelpers.js";
import {
  mapCacheInitAlias,
  isObjectAlias,
} from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { mergeDeep_2, safeGet_2, safeSet_2 } from "./_mergeWithFamily.js";
import { keysInAlias } from "../../src/utils/git/gitSafeEnv.js";
import { beginDeferredInits } from "../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 3 modules closed by ./_mergeWithFamily.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("vendor/lodash-es/_mergeWithFamily.js");
// This module is the first evaluated of an import cycle of 3 modules closed by ./_mergeWithFamily.js (in the hooks worker thread);
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("worker:vendor/lodash-es/_mergeWithFamily.js");
//@ chunk-z20c443b.js:143459-143640 placement
function baseMerge(object, source, srcIndex, customizer, stack) {
  if (object === source) return;
  baseEachAlias(
    source,
    function (srcValue, key) {
      if (!stack) stack = new mapCacheInitAlias();
      if (isObjectAlias(srcValue)) mergeDeep_2(object, source, key, srcIndex, baseMerge, customizer, stack);
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
