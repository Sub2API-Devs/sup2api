/**
 * @bufbuild/protobuf/dist/cjs/codegenv2/enum.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:378397-378745 cjs-require-graph
var Ea = x(function (bD) {
  Object.defineProperty(bD, "__esModule", { value: !0 });
  bD.enumDesc = H7;
  bD.tsEnum = K7;
  function H7(e, n, ...r) {
    if (r.length == 0) return e.enums[n];
    let s = r.pop();
    return r.reduce((h, y) => h.nestedMessages[y], e.messages[n]).nestedEnums[s];
  }
  function K7(e) {
    let n = {};
    for (let r of e.values) ((n[r.localName] = r.number), (n[r.number] = r.localName));
    return n;
  }
});

export { Ea };
