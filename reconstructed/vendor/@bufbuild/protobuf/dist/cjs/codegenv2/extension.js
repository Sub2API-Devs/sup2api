/**
 * @bufbuild/protobuf/dist/cjs/codegenv2/extension.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:426472-426713 cjs-require-graph
var hp = x(function (o2) {
  Object.defineProperty(o2, "__esModule", { value: !0 });
  o2.extDesc = dX;
  function dX(e, n, ...r) {
    if (r.length == 0) return e.extensions[n];
    let s = r.pop();
    return r.reduce((h, y) => h.nestedMessages[y], e.messages[n]).nestedExtensions[s];
  }
});

export { hp };
