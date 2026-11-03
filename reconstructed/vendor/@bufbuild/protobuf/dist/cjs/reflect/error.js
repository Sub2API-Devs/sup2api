/**
 * @bufbuild/protobuf/dist/cjs/reflect/error.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:321068-321485 cjs-require-graph
var op = x(function (EN) {
  Object.defineProperty(EN, "__esModule", { value: !0 });
  EN.FieldError = void 0;
  EN.isFieldError = $q;
  var Mq = ["FieldValueInvalidError", "FieldListRangeError", "ForeignFieldError"];
  class SN extends Error {
    constructor(e, n, r = "FieldValueInvalidError") {
      super(n);
      ((this.name = r), (this.field = () => e));
    }
  }
  EN.FieldError = SN;
  function $q(e) {
    return e instanceof Error && Mq.includes(e.name) && "field" in e && typeof e.field == "function";
  }
});

export { op };
