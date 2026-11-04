/**
 * @bufbuild/protobuf/dist/commonjs/reflect/scalar.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_proto_int64 } from "../proto-int64.js";
import { require_descriptors } from "../../cjs/descriptors.js";

//@ chunk-fq0cr76a.js:328178-329308 cjs-require-graph
var require_scalar = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.scalarEquals = scalarEquals;
  cjsExports.scalarZeroValue = scalarZeroValue;
  cjsExports.isScalarZeroValue = isScalarZeroValue;
  var proto_int64_js_1 = require_proto_int64();
  var descriptors_js_1 = require_descriptors();
  function scalarEquals(type, a, b) {
    if (a === b) return true;
    if (type == descriptors_js_1.ScalarType.BYTES) {
      if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) return false;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
      return true;
    }
    switch (type) {
      case descriptors_js_1.ScalarType.UINT64:
      case descriptors_js_1.ScalarType.FIXED64:
      case descriptors_js_1.ScalarType.INT64:
      case descriptors_js_1.ScalarType.SFIXED64:
      case descriptors_js_1.ScalarType.SINT64:
        return a == b;
    }
    return false;
  }
  function scalarZeroValue(type, longAsString) {
    switch (type) {
      case descriptors_js_1.ScalarType.STRING:
        return "";
      case descriptors_js_1.ScalarType.BOOL:
        return false;
      case descriptors_js_1.ScalarType.DOUBLE:
      case descriptors_js_1.ScalarType.FLOAT:
        return 0;
      case descriptors_js_1.ScalarType.INT64:
      case descriptors_js_1.ScalarType.UINT64:
      case descriptors_js_1.ScalarType.SFIXED64:
      case descriptors_js_1.ScalarType.FIXED64:
      case descriptors_js_1.ScalarType.SINT64:
        return longAsString ? "0" : proto_int64_js_1.protoInt64.zero;
      case descriptors_js_1.ScalarType.BYTES:
        return new Uint8Array(0);
      default:
        return 0;
    }
  }
  function isScalarZeroValue(type, value) {
    switch (type) {
      case descriptors_js_1.ScalarType.BOOL:
        return value === false;
      case descriptors_js_1.ScalarType.STRING:
        return value === "";
      case descriptors_js_1.ScalarType.BYTES:
        return value instanceof Uint8Array && !value.byteLength;
      default:
        return value == 0;
    }
  }
});
export { require_scalar };
