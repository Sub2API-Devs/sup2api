/**
 * @bufbuild/protobuf/dist/cjs/codegenv2/message.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:378224-378397 cjs-require-graph
var Ts = x(function (yD) {
  Object.defineProperty(yD, "__esModule", { value: !0 });
  yD.messageDesc = W7;
  function W7(e, n, ...r) {
    return r.reduce((s, h) => s.nestedMessages[h], e.messages[n]);
  }
});

export { Ts };
