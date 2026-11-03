/**
 * lodash-es/_overArg.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-z0q4jgnc.js (2)
 * attribution: placement 2
 */

//@ chunk-z0q4jgnc.js:580-632 placement
function overArg(r, t) {
  return function (e) {
    return r(t(e));
  };
}
//@ chunk-z0q4jgnc.js:632-643 placement
var sdo = overArg;

export { sdo };
