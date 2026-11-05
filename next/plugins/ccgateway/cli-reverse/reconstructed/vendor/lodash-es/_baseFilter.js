/**
 * lodash-es/_baseFilter.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-5b0f9k65.js (2)
 * attribution: placement 2
 */
import { baseEachInline2Alias } from "./_inlinedHelpers.js";

//@ chunk-5b0f9k65.js:308-388 placement
function baseFilter(collection, predicate) {
  var result = [];
  baseEachInline2Alias(collection, function (value, index, collection) {
    if (predicate(value, index, collection)) result.push(value);
  });
  return result;
}
//@ chunk-5b0f9k65.js:388-396 placement
var baseFilter_default = baseFilter;
export { baseFilter_default };
