/**
 * @bufbuild/cel/dist/cjs/proto.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_protobuf } from "../../../protobuf/dist/commonjs/index.js";
import { require_uint } from "./uint.js";

//@ chunk-qg41pqt6.js:468374-468765 cjs-fingerprint
var require_proto = __commonJS(function (cjsExports) {
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
