/**
 * protobufjs/src/util/pool.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-798ashq9.js:25666-25873 cjs-require-graph
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
