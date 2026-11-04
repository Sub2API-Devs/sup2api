/**
 * react/compiler-runtime.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: react@19.3.0..19.3.1
 * pieces: chunk-s89ma3n1.js (3)
 * attribution: placement 3
 */
import { init_react_production, addTransitionType } from "./cjs/react.production.js";

//@ chunk-s89ma3n1.js:230-234 placement
init_react_production();
//@ chunk-s89ma3n1.js:234-244 placement
var transitionTypeAdder = addTransitionType;
//@ chunk-s89ma3n1.js:244-290 placement
var useMemoCache = function (size) {
  return transitionTypeAdder.H.useMemoCache(size);
};
export { useMemoCache };
