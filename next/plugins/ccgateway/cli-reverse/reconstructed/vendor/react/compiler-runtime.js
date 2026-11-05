/**
 * react/compiler-runtime.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: react@19.3.0..19.3.1
 * pieces: chunk-zt8d60ng.js (3)
 * attribution: placement 3
 */
import { init_react_production, addTransitionType } from "./cjs/react.production.js";

//@ chunk-zt8d60ng.js:230-234 placement
init_react_production();
//@ chunk-zt8d60ng.js:234-244 placement
var transitionTypeAdder = addTransitionType;
//@ chunk-zt8d60ng.js:244-290 placement
var useMemoCache = function (size) {
  return transitionTypeAdder.H.useMemoCache(size);
};
export { useMemoCache };
