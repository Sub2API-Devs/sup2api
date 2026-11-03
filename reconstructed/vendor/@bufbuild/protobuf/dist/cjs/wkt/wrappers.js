/**
 * @bufbuild/protobuf/dist/cjs/wkt/wrappers.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:342537-343319 cjs-require-graph
var Fu = x(function (uk) {
  Object.defineProperty(uk, "__esModule", { value: !0 });
  uk.isWrapper = dY;
  uk.isWrapperDesc = lk;
  uk.hasCustomJsonRepresentation = fY;
  function dY(e) {
    return ck(e.$typeName);
  }
  function lk(e) {
    let n = e.fields[0];
    return ck(e.typeName) && n !== void 0 && n.fieldKind == "scalar" && n.name == "value" && n.number == 1;
  }
  function fY(e) {
    switch (e.typeName) {
      case "google.protobuf.Any":
      case "google.protobuf.Timestamp":
      case "google.protobuf.Duration":
      case "google.protobuf.FieldMask":
      case "google.protobuf.Struct":
      case "google.protobuf.Value":
      case "google.protobuf.ListValue":
        return !0;
      default:
        return lk(e);
    }
  }
  function ck(e) {
    return (
      e.startsWith("google.protobuf.") &&
      [
        "DoubleValue",
        "FloatValue",
        "Int64Value",
        "UInt64Value",
        "Int32Value",
        "UInt32Value",
        "BoolValue",
        "StringValue",
        "BytesValue",
      ].includes(e.substring(16))
    );
  }
});

export { Fu };
