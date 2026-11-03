/**
 * openid-client/lib/issuer_registry.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_lru_cache } from "../../lru-cache/index.js";

//@ chunk-1ny7cxrt.js:68879-68948 cjs-require-graph
var require_issuer_registry = x(function (cjsExports, cjsModule) {
  var LRU = require_lru_cache();
  cjsModule.exports = new LRU({
    max: 100,
  });
});
export { require_issuer_registry };
