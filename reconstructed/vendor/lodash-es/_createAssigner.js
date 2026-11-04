/**
 * lodash-es/_createAssigner.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-dcmhvw5a.js (1)
 * attribution: placement 1
 */
import { mergeKeys, isIterateeCall_2 } from "./_mergeWithFamily.js";

//@ chunk-dcmhvw5a.js:143711-143963 placement
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
