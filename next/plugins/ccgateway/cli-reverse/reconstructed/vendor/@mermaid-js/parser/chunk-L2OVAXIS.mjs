/**
 * @mermaid-js/parser/chunk-L2OVAXIS.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @mermaid-js/parser@1.2.1..2.0.0
 * pieces: chunk-wwjb4dqs.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
//@ chunk-wwjb4dqs.js:387-396 placement
var importsPlaceholder = {};
//@ chunk-wwjb4dqs.js:396-420 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wwjb4dqs.js:396", () => {
  __export(importsPlaceholder, {
    default: () => isBufferDefault,
  });
});
//@ chunk-wwjb4dqs.js:420-429 placement
var exportsPlaceholder = {};
//@ chunk-wwjb4dqs.js:429-453 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wwjb4dqs.js:429", () => {
  __export(exportsPlaceholder, {
    default: () => utilTypes,
  });
});
export { importsPlaceholder, exportsPlaceholder };
