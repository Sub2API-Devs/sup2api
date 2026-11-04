/**
 * lodash-es/_overArg.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-z0q4jgnc.js (2)
 * attribution: placement 2
 */

//@ chunk-z0q4jgnc.js:580-632 placement
function overArg(func, transform) {
  return function (arg) {
    return func(transform(arg));
  };
}
//@ chunk-z0q4jgnc.js:632-643 placement
var overArg_default = overArg;
export { overArg_default };
