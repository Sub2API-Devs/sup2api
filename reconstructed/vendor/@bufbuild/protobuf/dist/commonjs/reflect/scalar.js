/**
 * @bufbuild/protobuf/dist/commonjs/reflect/scalar.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { ko } from "../proto-int64.js";
import { Ns } from "../../cjs/descriptors.js";

//@ chunk-fq0cr76a.js:328178-329308 cjs-require-graph
var El = x(function (FN) {
  Object.defineProperty(FN, "__esModule", { value: !0 });
  FN.scalarEquals = vj;
  FN.scalarZeroValue = wj;
  FN.isScalarZeroValue = Tj;
  var UN = ko(),
    Dn = Ns();
  function vj(e, n, r) {
    if (n === r) return !0;
    if (e == Dn.ScalarType.BYTES) {
      if (!(n instanceof Uint8Array) || !(r instanceof Uint8Array)) return !1;
      if (n.length !== r.length) return !1;
      for (let s = 0; s < n.length; s++) if (n[s] !== r[s]) return !1;
      return !0;
    }
    switch (e) {
      case Dn.ScalarType.UINT64:
      case Dn.ScalarType.FIXED64:
      case Dn.ScalarType.INT64:
      case Dn.ScalarType.SFIXED64:
      case Dn.ScalarType.SINT64:
        return n == r;
    }
    return !1;
  }
  function wj(e, n) {
    switch (e) {
      case Dn.ScalarType.STRING:
        return "";
      case Dn.ScalarType.BOOL:
        return !1;
      case Dn.ScalarType.DOUBLE:
      case Dn.ScalarType.FLOAT:
        return 0;
      case Dn.ScalarType.INT64:
      case Dn.ScalarType.UINT64:
      case Dn.ScalarType.SFIXED64:
      case Dn.ScalarType.FIXED64:
      case Dn.ScalarType.SINT64:
        return n ? "0" : UN.protoInt64.zero;
      case Dn.ScalarType.BYTES:
        return new Uint8Array(0);
      default:
        return 0;
    }
  }
  function Tj(e, n) {
    switch (e) {
      case Dn.ScalarType.BOOL:
        return n === !1;
      case Dn.ScalarType.STRING:
        return n === "";
      case Dn.ScalarType.BYTES:
        return n instanceof Uint8Array && !n.byteLength;
      default:
        return n == 0;
    }
  }
});

export { El };
