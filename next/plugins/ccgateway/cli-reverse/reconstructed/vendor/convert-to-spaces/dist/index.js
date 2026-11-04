/**
 * convert-to-spaces/dist/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: convert-to-spaces@2.0.1
 * pieces: chunk-bzr73sfg.js (4)
 * attribution: esm-layout 3, esm-fingerprint 1
 */
import { AppContext } from "../../../src/ink/components/AppContext.js";
import { init_react_production, createContext } from "../../react/cjs/react.production.js";

//@ chunk-bzr73sfg.js:224050-224060 esm-layout
var APP_CONTEXT = AppContext;
//@ chunk-bzr73sfg.js:224060-224064 esm-layout
init_react_production();
//@ chunk-bzr73sfg.js:224064-224089 esm-layout
var defaultContextValue = createContext(() => {});
var createContextLazy = defaultContextValue;
//@ chunk-bzr73sfg.js:224089-224159 esm-fingerprint
var convertToSpaces = (input, spaces = 2) => input.replace(/^\t+/gm, ($1) => " ".repeat($1.length * spaces));
var convertToSpaces_default = convertToSpaces;
export { APP_CONTEXT, convertToSpaces_default, createContextLazy };
