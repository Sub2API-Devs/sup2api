/**
 * @bufbuild/cel/dist/cjs/proto.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { li } from "../../../protobuf/dist/commonjs/index.js";
import { Bi } from "./uint.js";

//@ chunk-fq0cr76a.js:467800-468191 cjs-fingerprint
var Sp = x(function (iL) {
  Object.defineProperty(iL, "__esModule", { value: !0 });
  iL.celFromScalar = aQ;
  var ci = li(),
    rL = Bi();
  function aQ(e, n) {
    switch (e) {
      case ci.ScalarType.UINT32:
      case ci.ScalarType.UINT64:
      case ci.ScalarType.FIXED32:
      case ci.ScalarType.FIXED64:
        return rL.celUint(BigInt(n));
      case ci.ScalarType.INT32:
      case ci.ScalarType.SINT32:
      case ci.ScalarType.SFIXED32:
        return BigInt(n);
      default:
        return n;
    }
  }
});

export { Sp };
