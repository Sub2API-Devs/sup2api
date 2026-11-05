/**
 * convert-to-spaces/dist/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: convert-to-spaces@2.0.1
 * pieces: chunk-2avr6cej.js (4)
 * attribution: esm-layout 3, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { AppContext } from "../../../src/ink/components/AppContext.js";
import { init_react_production, createContext } from "../../react/cjs/react.production.js";

//@ chunk-2avr6cej.js:223645-223655 esm-layout
var APP_CONTEXT = AppContext;
//@ chunk-2avr6cej.js:223655-223659 esm-layout
init_react_production();
//@ chunk-2avr6cej.js:223659-223684 esm-layout
var defaultContextValue = createContext(() => {});
var createContextLazy = defaultContextValue;
//@ chunk-2avr6cej.js:223684-223754 esm-fingerprint
var convertToSpaces = (input, spaces = 2) => input.replace(/^\t+/gm, ($1) => " ".repeat($1.length * spaces));
var convertToSpaces_default = convertToSpaces;
export { convertToSpaces_default, APP_CONTEXT, createContextLazy };
