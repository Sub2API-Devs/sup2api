/**
 * @bufbuild/protobuf/dist/cjs/is-message.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:323867-324123 cjs-require-graph
var vg = x(function (RN) {
  Object.defineProperty(RN, "__esModule", { value: !0 });
  RN.isMessage = oj;
  function oj(e, n) {
    if (!(e !== null && typeof e == "object" && "$typeName" in e && typeof e.$typeName == "string"))
      return !1;
    if (n === void 0) return !0;
    return n.typeName === e.$typeName;
  }
});

export { vg };
