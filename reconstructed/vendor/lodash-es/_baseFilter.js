/**
 * lodash-es/_baseFilter.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-9q5xd4yn.js (2)
 * attribution: placement 2
 */
import { mao } from "./_inlinedHelpers.js";

//@ chunk-9q5xd4yn.js:308-388 placement
function m(r, e) {
  var t = [];
  return (
    mao(r, function (o, f, i) {
      if (e(o, f, i)) t.push(o);
    }),
    t
  );
}
//@ chunk-9q5xd4yn.js:388-396 placement
var a = m;

export { a };
