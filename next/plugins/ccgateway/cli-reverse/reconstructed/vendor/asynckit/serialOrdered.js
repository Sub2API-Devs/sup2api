/**
 * asynckit/serialOrdered.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: asynckit@0.4.0..0.5.0
 * pieces: chunk-ww9agm6g.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../runtime/bun-runtime.js";
import { asyncModule3, require_state, abortModule3 } from "./lib/state.js";

//@ chunk-ww9agm6g.js:6876-7253 cjs-fingerprint
var require_serialOrdered = __commonJS(function (cjsExports, cjsModule) {
  var iterate = asyncModule3();
  var initState = require_state();
  var terminator = abortModule3();
  cjsModule.exports = serialOrdered;
  cjsModule.exports.ascending = ascending;
  cjsModule.exports.descending = descending;
  function serialOrdered(list, iterator, sortMethod, callback) {
    var state = initState(list, sortMethod);
    iterate(list, iterator, state, function iteratorHandler(error, result) {
      if (error) {
        callback(error, result);
        return;
      }
      state.index++;
      if (state.index < (state.keyedList || list).length) {
        iterate(list, iterator, state, iteratorHandler);
        return;
      }
      callback(null, state.results);
    });
    return terminator.bind(state, callback);
  }
  function ascending(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  }
  function descending(a, b) {
    return -1 * ascending(a, b);
  }
});
export { require_serialOrdered };
