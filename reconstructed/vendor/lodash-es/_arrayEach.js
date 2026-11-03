/**
 * lodash-es/_arrayEach.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-dcmhvw5a.js (2)
 * attribution: placement 2
 */

//@ chunk-dcmhvw5a.js:3550-3644 placement
function arrayEach(e, n) {
  var r = -1,
    s = e == null ? 0 : e.length;
  while (++r < s) if (n(e[r], r, e) === !1) break;
  return e;
}
//@ chunk-dcmhvw5a.js:3644-3654 placement
var ci = arrayEach;

export { ci };
