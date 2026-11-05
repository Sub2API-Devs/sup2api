/**
 * lodash-es/_createAssigner.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-z20c443b.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { mergeKeys, isIterateeCall_2 } from "./_mergeWithFamily.js";

//@ chunk-z20c443b.js:143859-144112 placement
function createAssigner(assigner) {
  return mergeKeys(function (object, sources) {
    var index = -1;
    var length = sources.length;
    var customizer = length > 1 ? sources[length - 1] : undefined;
    var guard = length > 2 ? sources[2] : undefined;
    customizer = assigner.length > 3 && typeof customizer == "function" ? (length--, customizer) : undefined;
    if (guard && isIterateeCall_2(sources[0], sources[1], guard)) {
      customizer = length < 3 ? undefined : customizer;
      length = 1;
    }
    object = Object(object);
    while (++index < length) {
      var source = sources[index];
      if (source) assigner(object, source, index, customizer);
    }
    return object;
  });
}
export { createAssigner };
