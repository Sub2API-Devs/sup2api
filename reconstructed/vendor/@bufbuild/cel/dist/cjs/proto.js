/**
 * @bufbuild/cel/dist/cjs/proto.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { require_protobuf } from "../../../protobuf/dist/commonjs/index.js";
import { require_uint } from "./uint.js";

//@ chunk-fq0cr76a.js:467800-468191 cjs-fingerprint
var require_proto = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.celFromScalar = celFromScalar;
  var protobuf_1 = require_protobuf();
  var uint_js_1 = require_uint();
  function celFromScalar(type, v) {
    switch (type) {
      case protobuf_1.ScalarType.UINT32:
      case protobuf_1.ScalarType.UINT64:
      case protobuf_1.ScalarType.FIXED32:
      case protobuf_1.ScalarType.FIXED64:
        return uint_js_1.celUint(BigInt(v));
      case protobuf_1.ScalarType.INT32:
      case protobuf_1.ScalarType.SINT32:
      case protobuf_1.ScalarType.SFIXED32:
        return BigInt(v);
      default:
        return v;
    }
  }
});
export { require_proto };
