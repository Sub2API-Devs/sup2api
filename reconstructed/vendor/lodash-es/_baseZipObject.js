/**
 * lodash-es/_baseZipObject.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-29pqxdaf.js (1)
 * attribution: placement 1
 */

//@ chunk-29pqxdaf.js:1524-1635 placement
function baseZipObject(e, n, o) {
  var r = -1,
    s = e.length,
    l = n.length,
    i = {};
  while (++r < s) {
    var d = r < l ? n[r] : void 0;
    o(i, e[r], d);
  }
  return i;
}

export { baseZipObject };
