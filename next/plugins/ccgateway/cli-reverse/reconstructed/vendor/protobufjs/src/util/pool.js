/**
 * protobufjs/src/util/pool.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-require-graph 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-vxhm2nqe.js:25666-25873 cjs-require-graph
var require_pool = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = pool;
  function pool(alloc, slice, size) {
    var SIZE = size || 8192;
    var MAX = SIZE >>> 1;
    var slab = null;
    var offset = SIZE;
    return function (size) {
      if (size < 1 || size > MAX) return alloc(size);
      if (offset + size > SIZE) {
        slab = alloc(SIZE);
        offset = 0;
      }
      var buf = slice.call(slab, offset, (offset += size));
      if (offset & 7) offset = (offset | 7) + 1;
      return buf;
    };
  }
});
export { require_pool };
