/**
 * @bufbuild/protobuf/dist/commonjs/codegenv2/scalar.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { Ns } from "../../cjs/descriptors.js";

//@ chunk-fq0cr76a.js:518581-519597 cjs-fingerprint
var aU = x(function (oU) {
  Object.defineProperty(oU, "__esModule", { value: !0 });
  oU.scalarTypeScriptType = fie;
  oU.scalarJsonType = pie;
  var hn = Ns();
  function fie(e, n) {
    switch (e) {
      case hn.ScalarType.STRING:
        return "string";
      case hn.ScalarType.BOOL:
        return "boolean";
      case hn.ScalarType.UINT64:
      case hn.ScalarType.SFIXED64:
      case hn.ScalarType.FIXED64:
      case hn.ScalarType.SINT64:
      case hn.ScalarType.INT64:
        return n ? "string" : "bigint";
      case hn.ScalarType.BYTES:
        return "Uint8Array";
      default:
        return "number";
    }
  }
  function pie(e) {
    switch (e) {
      case hn.ScalarType.DOUBLE:
      case hn.ScalarType.FLOAT:
        return 'number | "NaN" | "Infinity" | "-Infinity"';
      case hn.ScalarType.UINT64:
      case hn.ScalarType.SFIXED64:
      case hn.ScalarType.FIXED64:
      case hn.ScalarType.SINT64:
      case hn.ScalarType.INT64:
        return "string";
      case hn.ScalarType.INT32:
      case hn.ScalarType.FIXED32:
      case hn.ScalarType.UINT32:
      case hn.ScalarType.SFIXED32:
      case hn.ScalarType.SINT32:
        return "number";
      case hn.ScalarType.STRING:
        return "string";
      case hn.ScalarType.BOOL:
        return "boolean";
      case hn.ScalarType.BYTES:
        return "string";
    }
  }
});

export { aU };
