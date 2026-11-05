/**
 * openid-client/lib/issuer_registry.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_lru_cache } from "../../lru-cache/index.js";

//@ chunk-1hnjmk23.js:69248-69317 cjs-require-graph
var require_issuer_registry = __commonJS(function (cjsExports, cjsModule) {
  var LRU = require_lru_cache();
  cjsModule.exports = new LRU({
    max: 100,
  });
});
export { require_issuer_registry };
