/**
 * @bufbuild/protobuf/dist/commonjs/codegenv2/scalar.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { require_descriptors } from "../../cjs/descriptors.js";

//@ chunk-fq0cr76a.js:518581-519597 cjs-fingerprint
var require_scalar_2 = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.scalarTypeScriptType = scalarTypeScriptType;
  cjsExports.scalarJsonType = scalarJsonType;
  var descriptors_js_1 = require_descriptors();
  function scalarTypeScriptType(scalar, longAsString) {
    switch (scalar) {
      case descriptors_js_1.ScalarType.STRING:
        return "string";
      case descriptors_js_1.ScalarType.BOOL:
        return "boolean";
      case descriptors_js_1.ScalarType.UINT64:
      case descriptors_js_1.ScalarType.SFIXED64:
      case descriptors_js_1.ScalarType.FIXED64:
      case descriptors_js_1.ScalarType.SINT64:
      case descriptors_js_1.ScalarType.INT64:
        return longAsString ? "string" : "bigint";
      case descriptors_js_1.ScalarType.BYTES:
        return "Uint8Array";
      default:
        return "number";
    }
  }
  function scalarJsonType(scalar) {
    switch (scalar) {
      case descriptors_js_1.ScalarType.DOUBLE:
      case descriptors_js_1.ScalarType.FLOAT:
        return 'number | "NaN" | "Infinity" | "-Infinity"';
      case descriptors_js_1.ScalarType.UINT64:
      case descriptors_js_1.ScalarType.SFIXED64:
      case descriptors_js_1.ScalarType.FIXED64:
      case descriptors_js_1.ScalarType.SINT64:
      case descriptors_js_1.ScalarType.INT64:
        return "string";
      case descriptors_js_1.ScalarType.INT32:
      case descriptors_js_1.ScalarType.FIXED32:
      case descriptors_js_1.ScalarType.UINT32:
      case descriptors_js_1.ScalarType.SFIXED32:
      case descriptors_js_1.ScalarType.SINT32:
        return "number";
      case descriptors_js_1.ScalarType.STRING:
        return "string";
      case descriptors_js_1.ScalarType.BOOL:
        return "boolean";
      case descriptors_js_1.ScalarType.BYTES:
        return "string";
    }
  }
});
export { require_scalar_2 };
