/**
 * @mermaid-js/parser/chunk-L2OVAXIS.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mermaid-js/parser@1.2.1..2.0.0
 * pieces: chunk-z0q4jgnc.js (4)
 * attribution: placement 4
 */
import { __export } from "../../../runtime/bun-runtime.js";
import { isBufferDefault, utilTypes } from "./dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { deferInit, beginDeferredInits } from "../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 13 modules closed by ./dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs");
// This module is the first evaluated of an import cycle of 13 modules closed by ./dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs (in the hooks worker thread);
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("worker:vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs");
//@ chunk-z0q4jgnc.js:388-397 placement
var importsPlaceholder = {};
//@ chunk-z0q4jgnc.js:397-421 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-z0q4jgnc.js:397", () => {
  __export(importsPlaceholder, {
    default: () => isBufferDefault,
  });
});
//@ chunk-z0q4jgnc.js:421-430 placement
var exportsPlaceholder = {};
//@ chunk-z0q4jgnc.js:430-454 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-z0q4jgnc.js:430", () => {
  __export(exportsPlaceholder, {
    default: () => utilTypes,
  });
});
export { importsPlaceholder, exportsPlaceholder };
